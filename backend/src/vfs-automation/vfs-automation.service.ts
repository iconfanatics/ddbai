import { Injectable, Logger } from '@nestjs/common';
import { Browser } from 'playwright';

import { PrismaService } from '../prisma/prisma.service.js';

// ============================================================
// VFS Global Portugal Bangladesh - Cloudflare Turnstile Sitekey
// Captured live from VFS BGD→PRT challenges.cloudflare.com requests:
// 0x4AAAAAABhlz7Ei4byodYjs
// ============================================================
const VFS_TURNSTILE_SITEKEY = process.env.VFS_TURNSTILE_SITEKEY || '0x4AAAAAABhlz7Ei4byodYjs';

@Injectable()
export class VfsAutomationService {
  private readonly logger = new Logger(VfsAutomationService.name);

  constructor(private prisma: PrismaService) {}

  // ============================================================
  // WEBSHARE PROXY ROTATION
  // Fetches a random proxy from your Webshare account via API.
  // Prioritizes Portugal (PT) proxies first as requested.
  // ============================================================
  private async getRotatedProxy(staticProxyString: string): Promise<string> {
    const webshareApiKey = process.env.WEBSHARE_API_KEY;
    if (!webshareApiKey) {
      this.logger.log('[Proxy] No WEBSHARE_API_KEY set. Using static proxy string.');
      return staticProxyString;
    }

    try {
      this.logger.log('[Proxy] Fetching Portugal (PT) residential proxy from Webshare API...');
      // 1st priority: Portugal (PT) backbone proxy
      let res = await fetch('https://proxy.webshare.io/api/v2/proxy/list/?mode=backbone&page=1&page_size=100&country_code__in=PT', {
        headers: { 'Authorization': `Token ${webshareApiKey}` },
      });
      let data = await res.json() as any;
      let proxies: any[] = data.results || [];

      // 2nd priority: Standard Portugal (PT) proxy without backbone mode
      if (proxies.length === 0) {
        this.logger.log('[Proxy] No PT backbone proxies, checking standard PT proxy list...');
        res = await fetch('https://proxy.webshare.io/api/v2/proxy/list/?page=1&page_size=100&country_code__in=PT', {
          headers: { 'Authorization': `Token ${webshareApiKey}` },
        });
        data = await res.json() as any;
        proxies = data.results || [];
      }

      // 3rd priority: If Portugal is unavailable on this package, fallback to nearby European countries
      if (proxies.length === 0) {
        this.logger.warn('[Proxy] Portugal (PT) proxies not found in Webshare plan. Falling back to ES,FR,DE,NL,GB...');
        res = await fetch('https://proxy.webshare.io/api/v2/proxy/list/?mode=backbone&page=1&page_size=100&country_code__in=ES,FR,DE,NL,GB', {
          headers: { 'Authorization': `Token ${webshareApiKey}` },
        });
        data = await res.json() as any;
        proxies = data.results || [];
      }

      // 4th priority: Any backbone proxy
      if (proxies.length === 0) {
        res = await fetch('https://proxy.webshare.io/api/v2/proxy/list/?mode=backbone&page=1&page_size=100', {
          headers: { 'Authorization': `Token ${webshareApiKey}` },
        });
        data = await res.json() as any;
        proxies = data.results || [];
      }

      this.logger.log(`[Proxy] Webshare API response: count=${data?.count ?? 0}, results=${proxies.length}`);

      if (proxies.length === 0) {
        this.logger.warn('[Proxy] No proxies returned from Webshare API. Using static proxy.');
        return staticProxyString;
      }

      // Pick a random proxy from the filtered list
      const randomProxy = proxies[Math.floor(Math.random() * proxies.length)];
      const host = randomProxy.proxy_address || 'p.webshare.io';
      const port = randomProxy.port || 80;
      const proxyUrl = `http://${randomProxy.username}:${randomProxy.password}@${host}:${port}`;
      this.logger.log(`[Proxy] Selected Webshare proxy: ${host}:${port} (country: ${randomProxy.country_code || 'N/A'}, user: ${randomProxy.username})`);
      return proxyUrl;
    } catch (e: any) {
      this.logger.warn(`[Proxy] Failed to fetch from Webshare API: ${e.message}. Falling back to static proxy.`);
      return staticProxyString;
    }
  }

  // ============================================================
  // CAPSOLVER - Solve Turnstile using known sitekey
  // Works even when Turnstile widget is NOT visible in DOM.
  // ============================================================
  private async solveTurnstileWithCapSolver(
    capsolverKey: string,
    websiteURL: string,
    sitekey: string,
    userAgent?: string,
  ): Promise<string | null> {
    this.logger.log(`[CapSolver] Creating Turnstile task for sitekey: ${sitekey} on ${websiteURL}`);

    const payload: any = {
      clientKey: capsolverKey,
      task: {
        type: 'AntiTurnstileTaskProxyLess',
        websiteURL,
        websiteKey: sitekey,
      },
    };

    if (userAgent) {
      payload.task.userAgent = userAgent;
    }

    const createRes = await fetch('https://api.capsolver.com/createTask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const createResult = await createRes.json() as any;

    if (createResult.errorId > 0) {
      this.logger.error(`[CapSolver] Task creation failed: ${createResult.errorDescription} (${createResult.errorCode})`);
      return null;
    }

    const taskId = createResult.taskId;
    this.logger.log(`[CapSolver] Task created: ${taskId}. Polling for result...`);

    // Poll up to 2 minutes (24 x 5s)
    for (let i = 0; i < 24; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const resultRes = await fetch('https://api.capsolver.com/getTaskResult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientKey: capsolverKey, taskId }),
      });
      const result = await resultRes.json() as any;

      if (result.status === 'ready') {
        this.logger.log(`[CapSolver] ✅ Token received successfully!`);
        return result.solution?.token as string;
      } else if (result.status === 'processing') {
        this.logger.log(`[CapSolver] Still processing... (attempt ${i + 1}/24)`);
      } else {
        this.logger.error(`[CapSolver] Error: ${result.errorDescription || JSON.stringify(result)}`);
        return null;
      }
    }

    this.logger.warn(`[CapSolver] Timed out after 2 minutes.`);
    return null;
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  async loginToVFS(
    vfsEmail: string,
    vfsPassword: string,
    proxyString: string,
    mediaVideoPath: string | null = null,
    targetUrl: string = 'https://visa.vfsglobal.com/bgd/en/prt/login',
    applicationId?: string
  ): Promise<boolean> {
    return this.processVfsApplication(vfsEmail, vfsPassword, proxyString, mediaVideoPath, targetUrl, undefined, applicationId);
  }

  async updateAppStatus(id: string, status: string) {
    if (!id) return;
    try {
      await this.prisma.application.update({ where: { id }, data: { status } });
    } catch (e) {}
  }

  async processVfsApplication(
    vfsEmail: string,
    vfsPassword: string,
    proxyString: string,
    mediaVideoPath: string | null = null,
    targetUrl: string = 'https://visa.vfsglobal.com/bgd/en/prt/login',
    applicationConfig?: any,
    applicationId?: string
  ): Promise<boolean> {
    this.logger.log(`Starting VFS automation for ${vfsEmail} on ${targetUrl}`);
    if (applicationId) await this.updateAppStatus(applicationId, 'Starting browser...');
    let browser: Browser | null = null;

    try {
      // ==========================================
      // STEP 00a - ROTATE PROXY
      // ==========================================
      const resolvedProxyString = await this.getRotatedProxy(proxyString);

      // ==========================================
      // PROXY SETUP
      // ==========================================
      let proxyConfig: any = undefined;
      if (resolvedProxyString && resolvedProxyString.trim() !== '') {
        try {
          const url = new URL(resolvedProxyString.startsWith('http') ? resolvedProxyString : `http://${resolvedProxyString}`);
          const proxyServerStr = url.port ? `${url.protocol}//${url.hostname}:${url.port}` : `${url.protocol}//${url.hostname}`;
          proxyConfig = {
            server: proxyServerStr,
            username: url.username || undefined,
            password: url.password || undefined,
          };
          this.logger.log(`Using Proxy Server: ${proxyConfig.server}`);
          if (applicationId) await this.updateAppStatus(applicationId, `Starting (Proxy: ${proxyConfig.server})`);
        } catch (e) {
          this.logger.warn(`Invalid proxy format. Attempting without proxy. Error: ${e}`);
          if (applicationId) await this.updateAppStatus(applicationId, `Starting (No Proxy)`);
        }
      } else {
        if (applicationId) await this.updateAppStatus(applicationId, `Starting (No Proxy)`);
      }

      // ==========================================
      // VIRTUAL CAMERA FLAGS (For Face Verification)
      // ==========================================
      const launchArgs = [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ];

      if (mediaVideoPath) {
        this.logger.log(`Injecting virtual camera video from: ${mediaVideoPath}`);
        launchArgs.push('--use-fake-ui-for-media-stream');
        launchArgs.push('--use-fake-device-for-media-stream');
        launchArgs.push(`--use-file-for-fake-video-capture=${mediaVideoPath}`);
      }

      // ==========================================
      // LAUNCH BROWSER (Stealth)
      // ==========================================
      // @ts-ignore
      const { chromium } = await import('playwright-extra');
      // @ts-ignore
      const { default: stealthPlugin } = await import('puppeteer-extra-plugin-stealth');
      chromium.use(stealthPlugin());

      browser = await chromium.launch({
        headless: false,
        proxy: proxyConfig,
        args: launchArgs,
      });

      if (!browser) throw new Error('Failed to launch browser');

      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        locale: 'en-US',
        timezoneId: 'Asia/Dhaka',
      });
      const page = await context.newPage();

      // ==========================================
      // STEP 00b - Verify Proxy IP + CapSolver Balance
      // ==========================================
      this.logger.log(`[Step 00] Verifying Proxy IP...`);
      let proxyIp = 'Local/Direct';
      try {
        await page.goto('https://api.ipify.org?format=json', { waitUntil: 'domcontentloaded', timeout: 15000 });
        const ipText = await page.innerText('body');
        proxyIp = JSON.parse(ipText).ip;
        this.logger.log(`[Step 00] Connected Proxy IP: ${proxyIp}`);
      } catch (e) {
        this.logger.warn(`[Step 00] Could not fetch IP (Proxy might be slow or blocked).`);
      }

      if (applicationId && proxyIp && proxyIp !== 'Local/Direct') {
        try {
          await this.prisma.application.update({
            where: { id: applicationId },
            data: { proxy: proxyIp },
          });
          this.logger.log(`[Step 00] Saved Connected Proxy IP ${proxyIp} to Application ${applicationId}`);
        } catch (dbErr: any) {
          this.logger.warn(`[Step 00] Failed to update Application proxy in DB: ${dbErr?.message}`);
        }
      }

      let capBalance = 'N/A';
      const capsolverKey = process.env.CAPSOLVER_API_KEY;
      if (capsolverKey) {
        try {
          const balanceRes = await fetch('https://api.capsolver.com/getBalance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientKey: capsolverKey }),
          });
          const balanceData = await balanceRes.json() as any;
          capBalance = balanceData.balance ?? '0.00';
          this.logger.log(`[Step 00] CapSolver Balance: $${capBalance}`);
        } catch (e) {
          this.logger.warn(`[Step 00] Failed to fetch CapSolver balance.`);
        }
      }

      if (applicationId) {
        await this.updateAppStatus(applicationId, `IP: ${proxyIp} | CapSolver: $${capBalance}`);
      }

      // Listen to page console and error logs for debugging
      page.on('console', msg => {
        const text = msg.text();
        const type = msg.type();
        if (
          type === 'error' ||
          type === 'warning' ||
          text.toLowerCase().includes('turnstile') ||
          text.toLowerCase().includes('captcha') ||
          text.toLowerCase().includes('fail') ||
          text.includes('CAPTURED')
        ) {
          this.logger.log(`[PAGE-CONSOLE:${type}] ${text}`);
        }
      });
      page.on('pageerror', err => {
        this.logger.warn(`[PAGE-ERROR] ${err.message}`);
      });

      // Safe non-tampering interceptor to capture Turnstile render callback and options
      await page.addInitScript(() => {
        (window as any).__vfsTurnstileCallback = null;
        (window as any).__vfsTurnstileOptions = null;
        (window as any).__vfsTurnstileContainer = null;
        (window as any).__vfsRenderCalls = [];

        function hookTurnstileObj(tObj: any) {
          if (!tObj || tObj.__vfsHooked) return tObj;
          const origRender = tObj.render;
          if (typeof origRender === 'function') {
            tObj.render = function (c: any, opt: any) {
              try {
                const cDesc = typeof c === 'string' ? c : (c?.id ? `#${c.id}` : (c?.tagName || 'DOM_ELEMENT'));
                console.warn(`[CAPTURED-TURNSTILE-RENDER] Container: ${cDesc}, Options: ${JSON.stringify(opt)}`);
                (window as any).__vfsTurnstileContainer = c;
                (window as any).__vfsTurnstileOptions = opt;
                (window as any).__vfsRenderCalls.push({ container: c, options: opt });
                if (opt && typeof opt.callback === 'function') {
                  (window as any).__vfsTurnstileCallback = opt.callback;
                }
              } catch (e: any) {
                console.warn('[CAPTURED-TURNSTILE-ERROR] ' + e.message);
              }
              return origRender.apply(this, arguments);
            };
            tObj.__vfsHooked = true;
          }
          return tObj;
        }

        // Intercept via getter/setter on window.turnstile
        let _turnstile: any = (window as any).turnstile;
        try {
          Object.defineProperty(window, 'turnstile', {
            configurable: true,
            enumerable: true,
            get() {
              return _turnstile;
            },
            set(val) {
              _turnstile = hookTurnstileObj(val);
            },
          });
        } catch (_) {}

        // Fallback polling interval in case it was set directly
        setInterval(() => {
          if ((window as any).turnstile && !(window as any).turnstile.__vfsHooked) {
            hookTurnstileObj((window as any).turnstile);
          }
        }, 10);
      });

      // =========================================================
      // INTERCEPT NETWORK to capture actual Turnstile sitekey
      // Cloudflare requests contain the sitekey in the URL path:
      // /cdn-cgi/challenge-platform/.../rcv0/0x4AAAA.../...
      // =========================================================
      let capturedSitekey: string | null = null;
      page.on('request', (request: any) => {
        const url: string = request.url();
        // Match any Turnstile/Challenge sitekey pattern in Cloudflare request URLs
        const skMatch = url.match(/(0x4[a-zA-Z0-9_-]{10,})/i);
        if (skMatch && !capturedSitekey) {
          capturedSitekey = skMatch[1];
          this.logger.log(`[NET] 🔑 Captured Turnstile sitekey from network: ${capturedSitekey}`);
        }
      });

      // Log all Turnstile/API network responses for debugging
      page.on('response', async (response: any) => {
        const url: string = response.url();
        if (url.includes('/api/') || url.includes('capsolver') || url.includes('turnstile') || url.includes('cloudflare') || url.includes('auth') || url.includes('login')) {
          try {
            this.logger.log(`[NET] ${response.status()} ${url}`);
            if (url.includes('/api/') || url.includes('auth') || url.includes('login')) {
              try {
                const body = await response.text();
                this.logger.log(`[NET-BODY] ${body.substring(0, 300)}`);
              } catch (_) {}
            }
          } catch (e) {}
        }
      });

      // ==========================================
      // STEP 01 - Navigate to Login Page
      // ==========================================
      this.logger.log(`[Step 01] Navigating to Login Page: ${targetUrl}`);
      try {
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
      } catch (navErr: any) {
        this.logger.warn(`[Step 01] Navigation notice: ${navErr.message}. Checking if page loaded...`);
      }

      // Wait for page JS to settle
      await page.waitForTimeout(6000);

      await page.screenshot({ path: '/app/debug-login.png' });
      const pageTitle = await page.title();
      this.logger.log(`[Step 01] PAGE TITLE IS: "${pageTitle}"`);
      this.logger.log(`[Step 01] Screenshot saved to /app/debug-login.png`);

      // Accept cookies
      try {
        const cookieBtn = await page.waitForSelector('button:has-text("Accept All Cookies"), #onetrust-accept-btn-handler', { timeout: 4000 });
        if (cookieBtn) {
          await cookieBtn.click({ force: true });
          this.logger.log(`[Step 01] Accepted cookies.`);
          await page.waitForTimeout(1000);
        }
      } catch (_) {
        this.logger.log(`[Step 01] No cookie banner found.`);
      }

      // ==========================================
      // STEP 01b - Fill Login Form
      // ==========================================
      const emailSelector = 'input[formcontrolname="username"]:not(.d-none), input#email:not(.d-none)';
      const passwordSelector = 'input[formcontrolname="password"]:not(.d-none)';
      const loginBtnSelector = 'button[type="submit"], button:has-text("Sign in"), button:has-text("Login")';

      this.logger.log(`[Step 01] Waiting for form fields...`);
      await page.waitForSelector(emailSelector, { state: 'visible', timeout: 20000 });

      await page.locator(emailSelector).pressSequentially(vfsEmail, { delay: 60 });
      await page.keyboard.press('Tab');
      await page.waitForTimeout(400);
      this.logger.log(`[Step 01] Entered Email.`);
      if (applicationId) await this.updateAppStatus(applicationId, 'Entering credentials...');

      await page.locator(passwordSelector).pressSequentially(vfsPassword, { delay: 60 });
      await page.keyboard.press('Tab');
      await page.waitForTimeout(400);

      // Dispatch native input & change events for Angular
      await page.evaluate(({ email, pass }) => {
        const emailEl = document.querySelector('input[formcontrolname="username"], input#email') as HTMLInputElement;
        if (emailEl) {
          emailEl.value = email;
          emailEl.dispatchEvent(new Event('input', { bubbles: true }));
          emailEl.dispatchEvent(new Event('change', { bubbles: true }));
          emailEl.dispatchEvent(new Event('blur', { bubbles: true }));
        }
        const passEl = document.querySelector('input[formcontrolname="password"], input[type="password"]') as HTMLInputElement;
        if (passEl) {
          passEl.value = pass;
          passEl.dispatchEvent(new Event('input', { bubbles: true }));
          passEl.dispatchEvent(new Event('change', { bubbles: true }));
          passEl.dispatchEvent(new Event('blur', { bubbles: true }));
        }
      }, { email: vfsEmail, pass: vfsPassword });
      this.logger.log(`[Step 01] Credentials entered and Angular input events dispatched.`);

      // Wait 5s for page scripts to settle
      await page.waitForTimeout(5000);

      // ================================================================
      // DEEP SCAN: Find sitekey from DOM, scripts, and iframe sources
      // ================================================================
      const domDebug = await page.evaluate(() => {
        const invalids = Array.from(document.querySelectorAll('.ng-invalid')).map(el =>
          el.tagName + (el.getAttribute('formcontrolname') ? `[${el.getAttribute('formcontrolname')}]` : '') + ' ' + el.className
        );

        const iframes = Array.from(document.querySelectorAll('iframe')).map(f => ({
          src: f.src,
          name: f.name,
          id: f.id,
        }));

        const cfEl = document.querySelector('.cf-turnstile, [data-sitekey]');
        const cfSitekey = cfEl?.getAttribute('data-sitekey') ?? null;

        const scriptKeys: string[] = [];
        document.querySelectorAll('script:not([src])').forEach(s => {
          const matches = (s.textContent || '').matchAll(/0x4[a-zA-Z0-9_-]{8,}/g);
          for (const m of matches) scriptKeys.push(m[0]);
        });

        const allSitekeys: string[] = [];
        document.querySelectorAll('[sitekey], [data-sitekey], [ng-reflect-site-key]').forEach(el => {
          ['sitekey', 'data-sitekey', 'ng-reflect-site-key'].forEach(attr => {
            const v = el.getAttribute(attr);
            if (v) allSitekeys.push(v);
          });
        });

        return { invalids, iframes, cfSitekey, scriptKeys, allSitekeys };
      });

      this.logger.log(`[DEBUG] ng-invalid: ${JSON.stringify(domDebug.invalids)}`);
      this.logger.log(`[DEBUG] iframes: ${JSON.stringify(domDebug.iframes)}`);
      this.logger.log(`[DEBUG] DOM sitekey: ${domDebug.cfSitekey}`);
      this.logger.log(`[DEBUG] allSitekeys: ${JSON.stringify(domDebug.allSitekeys)}`);

      // Poll iframe src for sitekey
      let iframeSitekey: string | null = null;
      for (let i = 0; i < 5; i++) {
        iframeSitekey = await page.evaluate(() => {
          for (const f of Array.from(document.querySelectorAll('iframe'))) {
            if (!f.src) continue;
            const m = f.src.match(/\/(0x4[a-zA-Z0-9_-]+)\//);
            if (m) return m[1];
            try {
              const u = new URL(f.src);
              const k = u.searchParams.get('k') || u.searchParams.get('sitekey');
              if (k) return k;
            } catch (_) {}
          }
          return null;
        });
        if (iframeSitekey) {
          this.logger.log(`[DEBUG] 🔑 Found sitekey in iframe src: ${iframeSitekey}`);
          break;
        }
        await page.waitForTimeout(500);
      }

      // ==========================================
      // STEP 01c - Solve Cloudflare Turnstile
      // ==========================================
      if (capsolverKey) {
        if (applicationId) await this.updateAppStatus(applicationId, 'Solving Turnstile via CapSolver...');

        // Priority: 1) network captured  2) iframe  3) script  4) DOM  5) hardcoded VFS static key
        const sitekey = capturedSitekey || iframeSitekey || domDebug.scriptKeys[0] || domDebug.cfSitekey || VFS_TURNSTILE_SITEKEY;
        const skSource = capturedSitekey ? 'NETWORK ✅' : iframeSitekey ? 'IFRAME ✅' : domDebug.scriptKeys[0] ? 'SCRIPT ✅' : domDebug.cfSitekey ? 'DOM' : 'STATIC/DEFAULT 🎯';
        this.logger.log(`[Step 01] Using Turnstile sitekey: ${sitekey} (${skSource})`);

        const token = await this.solveTurnstileWithCapSolver(
          capsolverKey,
          targetUrl,
          sitekey,
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
        );

        // Log pre-injection DOM state for deep diagnosis
        const preDomInspect = await page.evaluate(() => {
          const cEl = document.querySelector('app-cloudflare-captcha-container');
          const fEl = document.querySelector('form');
          const bEl = document.querySelector('button.btn-brand-orange, form button[type="submit"]');
          const cfTurnstileEl = document.querySelector('.cf-turnstile, [data-sitekey]');
          const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
          return {
            captchaHtml: cEl ? cEl.outerHTML : 'NOT_FOUND',
            formHtml: fEl ? fEl.outerHTML.substring(0, 1500) : 'NOT_FOUND',
            buttonHtml: bEl ? bEl.outerHTML : 'NOT_FOUND',
            cfTurnstileHtml: cfTurnstileEl ? cfTurnstileEl.outerHTML : 'NOT_FOUND',
            iframes,
            turnstileExists: typeof (window as any).turnstile !== 'undefined',
            turnstileKeys: typeof (window as any).turnstile === 'object' ? Object.keys((window as any).turnstile || {}) : [],
          };
        });
        this.logger.log(`[DOM-PRE] Captcha Container: ${preDomInspect.captchaHtml}`);
        this.logger.log(`[DOM-PRE] CF Turnstile: ${preDomInspect.cfTurnstileHtml}`);
        this.logger.log(`[DOM-PRE] Submit Button: ${preDomInspect.buttonHtml}`);
        this.logger.log(`[DOM-PRE] Turnstile window keys: ${JSON.stringify(preDomInspect.turnstileKeys)} (exists: ${preDomInspect.turnstileExists})`);

        if (token) {
          this.logger.log(`[Step 01] Injecting Turnstile token into page & Angular Ivy forms...`);

          // Deep injection, callback execution, and parent-walking Angular Ivy traversal
          const angularReport = await page.evaluate(({ t, email, pass }) => {
            const report: any = {
              turnstileHookFound: !!(window as any).__vfsTurnstileCallback,
              turnstileOptionsFound: !!(window as any).__vfsTurnstileOptions,
              cbInvoked: false,
              cbMethod: null,
              cbError: null,
              injectedInputsCount: 0,
              lViewsFoundCount: 0,
              formsCount: 0,
              componentsCount: 0,
              loginComponentFound: false,
              loginComponentKeys: [],
              loginComponentMethods: [],
              captchaComponentFound: false,
              calledMethods: [],
              buttonDisabledBefore: null,
              buttonClassesBefore: null,
            };

            // Helper to invoke callback inside Zone.js to trigger Angular Change Detection
            const invokeInZone = (fn: any, arg: any, label: string) => {
              if (typeof fn !== 'function') return false;
              try {
                if ((window as any).Zone && (window as any).Zone.current) {
                  (window as any).Zone.current.run(() => fn(arg));
                } else {
                  fn(arg);
                }
                report.cbInvoked = true;
                report.cbMethod = label;
                return true;
              } catch (err: any) {
                report.cbError = `${label}: ${err.message}`;
                return false;
              }
            };

            // --- 1. INVOKE CAPTURED TURNSTILE CALLBACK ---
            if ((window as any).__vfsTurnstileCallback) {
              invokeInZone((window as any).__vfsTurnstileCallback, t, '__vfsTurnstileCallback');
            }
            if (!report.cbInvoked && (window as any).__vfsTurnstileOptions?.callback) {
              invokeInZone((window as any).__vfsTurnstileOptions.callback, t, '__vfsTurnstileOptions.callback');
            }
            if (!report.cbInvoked && Array.isArray((window as any).__vfsRenderCalls)) {
              for (let i = 0; i < (window as any).__vfsRenderCalls.length; i++) {
                const call = (window as any).__vfsRenderCalls[i];
                if (call.options && typeof call.options.callback === 'function') {
                  if (invokeInZone(call.options.callback, t, `__vfsRenderCalls[${i}].callback`)) break;
                }
              }
            }

            // Global callbacks on window (e.g. data-callback)
            for (const k of Object.keys(window)) {
              if (typeof (window as any)[k] === 'function' &&
                  (k.toLowerCase().includes('turnstile') || k.toLowerCase().includes('captcha')) &&
                  !k.startsWith('__vfs')) {
                try {
                  invokeInZone((window as any)[k], t, `window.${k}`);
                } catch (_) {}
              }
            }

            // Update turnstile.getResponse
            if (typeof (window as any).turnstile === 'object' && (window as any).turnstile !== null) {
              try {
                (window as any).turnstile.getResponse = () => t;
              } catch (_) {}
            }

            // --- 2. DOM INPUT INJECTION ---
            const injectInputTo = (container: Element | null) => {
              if (!container) return;
              let inp = container.querySelector('input[name="cf-turnstile-response"]') as HTMLInputElement;
              if (!inp) {
                inp = document.createElement('input');
                inp.type = 'hidden';
                inp.name = 'cf-turnstile-response';
                container.appendChild(inp);
              }
              inp.value = t;
              inp.dispatchEvent(new Event('input', { bubbles: true }));
              inp.dispatchEvent(new Event('change', { bubbles: true }));
              report.injectedInputsCount++;
            };

            document.querySelectorAll('form').forEach(f => injectInputTo(f));
            document.querySelectorAll('app-cloudflare-captcha-container').forEach(c => injectInputTo(c));
            document.querySelectorAll('.cf-turnstile, #widgetId, [id*="cf-"], [id*="turnstile"]').forEach(w => injectInputTo(w));

            const capturedContainer = (window as any).__vfsTurnstileContainer;
            if (capturedContainer) {
              if (typeof capturedContainer === 'string') {
                const el = document.querySelector(capturedContainer);
                if (el) injectInputTo(el);
              } else if (capturedContainer instanceof Element) {
                injectInputTo(capturedContainer);
              }
            }

            // Post message for any listeners
            try {
              window.postMessage({ source: 'cloudflare-turnstile', event: 'success', token: t }, '*');
              window.postMessage({ type: 'cf-turnstile-response', token: t }, '*');
            } catch (_) {}

            // --- 3. PARENT-WALKING ANGULAR IVY DEEP SEARCH ---
            const lViewList: any[] = [];
            const visitedViews = new Set<any>();

            const addLView = (view: any) => {
              if (!view || visitedViews.has(view)) return;
              visitedViews.add(view);
              if (Array.isArray(view)) lViewList.push(view);
            };

            // Scan all DOM elements and walk up parents to collect LViews
            document.querySelectorAll('*').forEach((el: any) => {
              const ctx = el.__ngContext__;
              if (Array.isArray(ctx)) {
                addLView(ctx);
              } else if (typeof ctx === 'number') {
                let p = el.parentElement;
                while (p) {
                  const pCtx = (p as any).__ngContext__;
                  if (Array.isArray(pCtx)) {
                    addLView(pCtx);
                    break;
                  }
                  if (pCtx && Array.isArray(pCtx.lView)) {
                    addLView(pCtx.lView);
                    break;
                  }
                  p = p.parentElement;
                }
              } else if (ctx && typeof ctx === 'object') {
                if (Array.isArray(ctx.lView)) addLView(ctx.lView);
                if (Array.isArray(ctx.raw)) addLView(ctx.raw);
              }
            });

            report.lViewsFoundCount = lViewList.length;

            const foundForms: any[] = [];
            const foundComponents: any[] = [];
            let loginCompInstance: any = null;
            let captchaCompInstance: any = null;

            function inspectItem(item: any) {
              if (!item || typeof item !== 'object' || item instanceof Node || Array.isArray(item)) return;

              // Check if FormGroup
              if (item.controls && typeof item.patchValue === 'function') {
                if (!foundForms.includes(item)) foundForms.push(item);
              }
              if (item.form && item.form.controls && typeof item.form.patchValue === 'function') {
                if (!foundForms.includes(item.form)) foundForms.push(item.form);
              }

              // Check item's properties for nested FormGroups
              for (const k of Object.keys(item)) {
                const val = item[k];
                if (val && typeof val === 'object' && val.controls && typeof val.patchValue === 'function') {
                  if (!foundForms.includes(val)) foundForms.push(val);
                }
              }

              // Check if Login Component
              const proto = Object.getPrototypeOf(item) || {};
              const methods = Object.getOwnPropertyNames(proto);
              const keys = Object.keys(item);
              const isLogin =
                methods.some(m => /submit|login|signin|auth/i.test(m)) ||
                keys.some(k => /login|username|email|password/i.test(k));

              if (isLogin && !foundComponents.includes(item)) {
                foundComponents.push(item);
                if (!loginCompInstance) loginCompInstance = item;
              }

              // Check if Captcha Component
              const isCaptcha =
                keys.some(k => /captcha|turnstile|sitekey|widgetid|resolved/i.test(k)) ||
                methods.some(m => /captcha|turnstile|resolved|verify/i.test(m));

              if (isCaptcha && !captchaCompInstance && item !== loginCompInstance) {
                captchaCompInstance = item;
              }
            }

            // Inspect all collected LViews
            for (const lv of lViewList) {
              if (lv.length > 8) {
                const comp = lv[8];
                if (comp && typeof comp === 'object' && !(comp instanceof Node) && !Array.isArray(comp)) {
                  inspectItem(comp);
                }
              }
              for (let i = 0; i < lv.length; i++) {
                const it = lv[i];
                if (!it) continue;
                if (Array.isArray(it)) {
                  addLView(it);
                } else if (typeof it === 'object' && !(it instanceof Node)) {
                  inspectItem(it);
                }
              }
            }

            // --- 4. PATCH LOGIN COMPONENT ---
            if (loginCompInstance) {
              report.loginComponentFound = true;
              report.loginComponentKeys = Object.keys(loginCompInstance);
              const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(loginCompInstance) || {});
              report.loginComponentMethods = methods;

              // Pass token into component properties
              for (const k of Object.keys(loginCompInstance)) {
                if (/token|captcha|response/i.test(k)) {
                  try { loginCompInstance[k] = t; } catch (_) {}
                }
                if (/isCaptcha|resolved|verified/i.test(k)) {
                  try { loginCompInstance[k] = true; } catch (_) {}
                }
              }
              loginCompInstance.captchaToken = t;
              loginCompInstance.token = t;
              loginCompInstance.turnstileToken = t;
              loginCompInstance.isCaptchaResolved = true;
              loginCompInstance.captchaResolved = true;
              loginCompInstance.isCaptchaValid = true;
              loginCompInstance.captchaResponse = t;

              // Call component callback methods
              for (const m of methods) {
                if (/captcha|token|resolved|verify/i.test(m) && typeof loginCompInstance[m] === 'function') {
                  try {
                    loginCompInstance[m](t);
                    report.calledMethods.push(m);
                  } catch (_) {}
                }
              }

              // Save on window for direct submission
              (window as any).__vfsLoginComponent = loginCompInstance;
            }

            // --- 5. PATCH CAPTCHA COMPONENT ---
            if (captchaCompInstance) {
              report.captchaComponentFound = true;
              for (const k of Object.keys(captchaCompInstance)) {
                if (/token|captcha|response/i.test(k)) {
                  try { captchaCompInstance[k] = t; } catch (_) {}
                }
                const val = captchaCompInstance[k];
                if (val && typeof val.emit === 'function') {
                  try { val.emit(t); } catch (_) {}
                  try { val.emit({ token: t, response: t }); } catch (_) {}
                }
              }
              for (const m of Object.getOwnPropertyNames(Object.getPrototypeOf(captchaCompInstance) || {})) {
                if (/verify|success|resolved|callback|settoken/i.test(m) && typeof captchaCompInstance[m] === 'function') {
                  try { captchaCompInstance[m](t); } catch (_) {}
                }
              }
            }

            // --- 6. PATCH ALL FOUND FORM GROUPS ---
            report.formsCount = foundForms.length;
            report.componentsCount = foundComponents.length;
            for (const fg of foundForms) {
              const ctrlKeys = Object.keys(fg.controls || {});
              for (const cName of ctrlKeys) {
                const ctrl = fg.controls[cName];
                if (/email|user/i.test(cName)) {
                  ctrl.setValue(email);
                  ctrl.setErrors(null);
                } else if (/pass/i.test(cName)) {
                  ctrl.setValue(pass);
                  ctrl.setErrors(null);
                } else {
                  ctrl.setValue(t);
                  ctrl.setErrors(null);
                }
                ctrl.markAsDirty();
                ctrl.markAsTouched();
                ctrl.updateValueAndValidity();
              }
              fg.setErrors(null);
              fg.updateValueAndValidity();
            }

            // --- 7. TRIGGER ANGULAR ZONE & CHANGE DETECTION ---
            if ((window as any).Zone && (window as any).Zone.current) {
              (window as any).Zone.current.run(() => {
                if (loginCompInstance) {
                  for (const k of Object.keys(loginCompInstance)) {
                    const v = loginCompInstance[k];
                    if (v && typeof v.detectChanges === 'function') {
                      try { v.detectChanges(); } catch (_) {}
                    }
                  }
                }
              });
            }

            // --- 8. CLEAN OVERLAYS & RECORD BUTTON STATUS ---
            document.querySelectorAll('#onetrust-banner-sdk, #onetrust-consent-sdk, .onetrust-pc-dark-filter').forEach(el => el.remove());

            const signinBtn = document.querySelector('button.btn-brand-orange, form button[type="submit"]') as HTMLButtonElement;
            if (signinBtn) {
              report.buttonDisabledBefore = signinBtn.disabled;
              report.buttonClassesBefore = signinBtn.className;
            }

            return report;
          }, { t: token, email: vfsEmail, pass: vfsPassword });

          this.logger.log(`[Step 01] Injection Report: ${JSON.stringify(angularReport)}`);

          // Allow Angular Zone and Change Detection 1.5s to settle
          await page.waitForTimeout(1500);

          // Verify button state
          const btnStatus = await page.evaluate(() => {
            const btn = document.querySelector('button.btn-brand-orange, form button[type="submit"]') as HTMLButtonElement;
            if (!btn) return { exists: false, disabled: true, classes: '' };
            return {
              exists: true,
              disabled: btn.disabled,
              hasDisabledAttr: btn.hasAttribute('disabled'),
              classes: btn.className,
            };
          });
          this.logger.log(`[Step 01] Button state after Angular cycle: disabled=${btnStatus.disabled}, hasDisabledAttr=${btnStatus.hasDisabledAttr}`);

          // If still disabled, unlock in DOM
          await page.evaluate(() => {
            const btn = document.querySelector('button.btn-brand-orange, form button[type="submit"]') as HTMLButtonElement;
            if (btn) {
              btn.removeAttribute('disabled');
              btn.disabled = false;
              btn.classList.remove('mat-mdc-button-disabled', 'mdc-button--disabled');
              (btn.style as any).pointerEvents = 'auto';
            }
            const form = document.querySelector('form');
            if (form) {
              form.classList.remove('ng-invalid');
              form.classList.add('ng-valid');
            }
          });
          this.logger.log(`[Step 01] Token injected and Angular forms patched.`);
        } else {
          this.logger.warn(`[Step 01] CapSolver did not return a token.`);
        }
      } else {
        this.logger.log(`[Step 01] No CapSolver key. Waiting 15s for Turnstile auto-solve...`);
        await page.waitForTimeout(15000);
      }

      // ==========================================
      // STEP 01d - Submit Login Form
      // ==========================================
      // Monitor network for login API call
      let loginApiTriggered = false;
      const onLoginResponse = (res: any) => {
        const u = res.url();
        if (u.includes('/login') || u.includes('/auth') || u.includes('/authenticate') || u.includes('user/login')) {
          loginApiTriggered = true;
          this.logger.log(`[Step 01] 🎯 VFS Login API responded: ${res.status()} ${u}`);
        }
      };
      page.on('response', onLoginResponse);

      // Trigger component methods directly if available
      const calledMethod = await page.evaluate(() => {
        let called: string | null = null;
        const loginComp = (window as any).__vfsLoginComponent;
        if (loginComp) {
          const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(loginComp) || {});
          for (const m of ['onSubmit', 'login', 'signIn', 'authenticate', 'onLogin', 'submit']) {
            if (typeof loginComp[m] === 'function') {
              try {
                loginComp[m]();
                called = `__vfsLoginComponent.${m}`;
                return called;
              } catch (_) {}
            }
          }
        }
        return called;
      });

      if (calledMethod) {
        this.logger.log(`[Step 01] Called Angular component method directly: ${calledMethod}`);
      }

      // Submit via DOM button click & form.requestSubmit
      await page.evaluate(() => {
        const btn = document.querySelector('button.btn-brand-orange, form button[type="submit"]') as HTMLButtonElement;
        if (btn) {
          btn.removeAttribute('disabled');
          btn.disabled = false;
          btn.classList.remove('mat-mdc-button-disabled', 'mdc-button--disabled');
          (btn.style as any).pointerEvents = 'auto';
          btn.click();
        }
        const form = document.querySelector('form');
        if (form) {
          try {
            if (btn) form.requestSubmit(btn);
            else form.requestSubmit();
          } catch (_) {
            try { form.submit(); } catch (_) {}
          }
        }
      });
      this.logger.log(`[Step 01] Dispatched DOM button click and form requestSubmit.`);

      // Also simulate click using Playwright locator
      try {
        const orangeBtn = page.locator('button.btn-brand-orange, form button[type="submit"]').first();
        await orangeBtn.click({ force: true, timeout: 5000 });
        this.logger.log(`[Step 01] Clicked Sign In button with Playwright.`);
      } catch (clickErr: any) {
        this.logger.log(`[Step 01] Playwright click notice: ${clickErr.message}`);
      }

      if (applicationId) await this.updateAppStatus(applicationId, 'Submitted login form...');

      // Wait 10 seconds for VFS authentication response & navigation
      this.logger.log(`[Step 01] Waiting for authentication response...`);
      await page.waitForTimeout(10000);
      await page.screenshot({ path: '/app/debug-after-login.png' });
      this.logger.log(`[Step 01] Post-login screenshot saved to /app/debug-after-login.png`);

      const pageErrors = await page.evaluate(() => {
        const errors: string[] = [];
        document.querySelectorAll('mat-error, .alert, .toast-message, app-notification, .error-message').forEach(el => {
          const txt = el.textContent?.trim();
          if (txt && txt !== '*') errors.push(txt);
        });
        return errors;
      });
      if (pageErrors.length > 0) {
        this.logger.warn(`[Step 01] Page alerts/errors: ${JSON.stringify(pageErrors)}`);
      }

      // Save session cookies
      await context.storageState({ path: '/app/vfs-session.json' });
      this.logger.log(`[Step 01] Browser session saved.`);

      // ==========================================
      // STEP 02 - Wait for Dashboard
      // ==========================================
      this.logger.log(`[Step 02] Waiting for Dashboard...`);
      if (applicationId) await this.updateAppStatus(applicationId, 'Waiting for Dashboard...');
      try {
        await page.waitForSelector('button:has-text("Start New Booking")', { timeout: 45000 });
        await page.click('button:has-text("Start New Booking")');
        this.logger.log(`[Step 02] ✅ Logged in! Clicked "Start New Booking"`);
        if (applicationId) await this.updateAppStatus(applicationId, 'Logged In Successfully!');
      } catch (_) {
        const title2 = await page.title();
        const html2 = await page.evaluate(() => document.body.innerHTML);
        this.logger.warn(`[Step 02] Dashboard not found. Page title: "${title2}"`);
        this.logger.log(`[DEBUG-STEP-2] HTML: ${html2.substring(0, 3000)}`);
        await page.screenshot({ path: '/app/debug-dashboard-failed.png' });
        if (applicationId) await this.updateAppStatus(applicationId, `Login failed — stuck at: ${title2}`);
      }

      // ==========================================
      // STEP 03..11 — Booking flow (TODO)
      // ==========================================
      this.logger.log(`[Step 03] Category Selection... (TODO)`);
      this.logger.log(`[Step 04] Date Availability... (TODO)`);
      this.logger.log(`[Step 05] Applicant Details... (TODO)`);
      this.logger.log(`[Step 06] Face Verification... (TODO)`);
      this.logger.log(`[Step 07] Date/Time Slot... (TODO)`);
      this.logger.log(`[Step 08] Additional Services... (TODO)`);
      this.logger.log(`[Step 09&10] Review & Final Review... (TODO)`);
      this.logger.log(`[Step 11] Payment/Completion... (TODO)`);

      this.logger.log(`[TESTING] Keeping browser open for 5 minutes for inspection...`);
      if (applicationId) await this.updateAppStatus(applicationId, 'Waiting (Inspect Browser)...');
      await page.waitForTimeout(300000);

      return true;
    } catch (error: any) {
      this.logger.error(`VFS Automation failed: ${error.message}`, error.stack);
      if (applicationId) await this.updateAppStatus(applicationId, 'Failed / Error');
      return false;
    } finally {
      if (browser) {
        await browser.close();
        this.logger.log(`Browser closed.`);
        if (applicationId) await this.updateAppStatus(applicationId, 'Finished');
      }
    }
  }
}

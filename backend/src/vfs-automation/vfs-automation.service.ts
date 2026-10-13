import { Injectable, Logger } from '@nestjs/common';
import { Browser } from 'playwright';

import { PrismaService } from '../prisma/prisma.service.js';

// ============================================================
// VFS Global Portugal Bangladesh - Cloudflare Turnstile Sitekey
// This key is static for the VFS BGD→PRT login page.
// Update if VFS changes it (check network tab for challenges.cloudflare.com requests)
// ============================================================
const VFS_TURNSTILE_SITEKEY = process.env.VFS_TURNSTILE_SITEKEY || '0x4AAAAAAACYaM3U_Dz-4DN1';

@Injectable()
export class VfsAutomationService {
  private readonly logger = new Logger(VfsAutomationService.name);

  constructor(private prisma: PrismaService) {}

  // ============================================================
  // WEBSHARE PROXY ROTATION
  // Fetches a random proxy from your Webshare account via API.
  // Falls back to the static proxyString if API key is not set.
  // ============================================================
  private async getRotatedProxy(staticProxyString: string): Promise<string> {
    const webshareApiKey = process.env.WEBSHARE_API_KEY;
    if (!webshareApiKey) {
      this.logger.log('[Proxy] No WEBSHARE_API_KEY set. Using static proxy string.');
      return staticProxyString;
    }

    try {
      this.logger.log('[Proxy] Fetching random proxy from Webshare API...');
      // 1st attempt: mode=backbone (for Residential / Backbone packages)
      let res = await fetch('https://proxy.webshare.io/api/v2/proxy/list/?mode=backbone&page=1&page_size=100', {
        headers: {
          'Authorization': `Token ${webshareApiKey}`,
        },
      });
      let data = await res.json() as any;
      let proxies: any[] = data.results || [];

      // 2nd attempt: general list without mode filter if backbone returned empty
      if (proxies.length === 0) {
        res = await fetch('https://proxy.webshare.io/api/v2/proxy/list/?page=1&page_size=100', {
          headers: {
            'Authorization': `Token ${webshareApiKey}`,
          },
        });
        data = await res.json() as any;
        proxies = data.results || [];
      }

      this.logger.log(`[Proxy] Webshare API response: count=${data?.count ?? 0}, results=${proxies.length}`);

      if (proxies.length === 0) {
        this.logger.warn('[Proxy] No proxies returned from Webshare API. Using static proxy.');
        return staticProxyString;
      }

      // Pick a random proxy from the list
      const randomProxy = proxies[Math.floor(Math.random() * proxies.length)];
      const proxyUrl = `http://${randomProxy.username}:${randomProxy.password}@${randomProxy.proxy_address}:${randomProxy.port}`;
      this.logger.log(`[Proxy] Selected random Webshare proxy: ${randomProxy.proxy_address}:${randomProxy.port} (${randomProxy.username})`);
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

      // Intercept Turnstile to capture sitekey + auto-token
      await page.addInitScript(() => {
        (window as any).__turnstileToken = null;
        (window as any).__turnstileSitekey = null;
        Object.defineProperty(window, 'turnstile', {
          get: () => (window as any).__turnstileImpl,
          set: (val: any) => {
            const origRender = val.render;
            val.render = function (ele: any, options: any) {
              // ⭐ Capture the sitekey from render options
              const sk = options?.sitekey || options?.websiteKey || options?.site_key;
              if (sk) (window as any).__turnstileSitekey = sk;

              // Also capture token when callback fires (auto-solve)
              if (options?.callback) {
                const origCb = options.callback;
                options.callback = (token: string) => {
                  (window as any).__turnstileToken = token;
                  return origCb(token);
                };
              }
              return origRender.apply(this, [ele, options]);
            };
            (window as any).__turnstileImpl = val;
          },
          configurable: true,
        });
      });

      // =========================================================
      // INTERCEPT NETWORK to capture actual Turnstile sitekey
      // Cloudflare requests contain the sitekey in the URL path:
      // /cdn-cgi/challenge-platform/.../rcv0/0x4AAAA.../...
      // =========================================================
      let capturedSitekey: string | null = null;
      page.on('request', (request: any) => {
        const url: string = request.url();
        // Match sitekey pattern: /rcv0/0x... or /sitekey/0x...
        const skMatch = url.match(/\/(?:rcv0|sitekey)\/(0x[a-zA-Z0-9_-]+)/);
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
      if (applicationId) await this.updateAppStatus(applicationId, 'Navigating to VFS Login...');
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

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

      await page.locator(emailSelector).pressSequentially(vfsEmail, { delay: 80 });
      await page.keyboard.press('Tab');
      await page.waitForTimeout(500);
      this.logger.log(`[Step 01] Entered Email.`);
      if (applicationId) await this.updateAppStatus(applicationId, 'Entering credentials...');

      await page.locator(passwordSelector).pressSequentially(vfsPassword, { delay: 80 });
      await page.keyboard.press('Tab');
      this.logger.log(`[Step 01] Entered Password. Waiting 12s for Angular/Cloudflare to initialize captcha...`);
      
      // Wait for Angular to render the captcha component and Turnstile to call render()
      await page.waitForTimeout(12000);

      // Read sitekey captured by our initScript interceptor
      const initScriptSitekey = await page.evaluate(() => (window as any).__turnstileSitekey as string | null);
      const initScriptToken = await page.evaluate(() => (window as any).__turnstileToken as string | null);
      this.logger.log(`[DEBUG] initScript captured sitekey: ${initScriptSitekey}`);
      this.logger.log(`[DEBUG] initScript auto-token: ${initScriptToken ? 'YES ✅' : 'null'}`);

      // ================================================================
      // DEEP SCAN: Find sitekey from DOM, scripts, and iframe sources
      // ================================================================
      const domDebug = await page.evaluate(() => {
        const invalids = Array.from(document.querySelectorAll('.ng-invalid')).map(el =>
          el.tagName + (el.getAttribute('formcontrolname') ? `[${el.getAttribute('formcontrolname')}]` : '') + ' ' + el.className
        );

        // Wait-free iframe scan including contentWindow
        const iframes = Array.from(document.querySelectorAll('iframe')).map(f => ({
          src: f.src,
          name: f.name,
          id: f.id,
        }));

        // DOM sitekey from standard elements
        const cfEl = document.querySelector('.cf-turnstile, [data-sitekey]');
        const cfSitekey = cfEl?.getAttribute('data-sitekey') ?? null;

        // Scan all inline scripts for 0x4... pattern (Turnstile sitekey format)
        const scriptKeys: string[] = [];
        document.querySelectorAll('script:not([src])').forEach(s => {
          const matches = (s.textContent || '').matchAll(/0x4[a-zA-Z0-9_-]{8,}/g);
          for (const m of matches) scriptKeys.push(m[0]);
        });

        // Scan all script src URLs
        const scriptSrcs = Array.from(document.querySelectorAll('script[src]')).map(s => (s as HTMLScriptElement).src);

        // Scan app-captcha component attributes
        const captchaEl = document.querySelector('app-captcha');
        const captchaHtml = captchaEl ? captchaEl.outerHTML.substring(0, 500) : null;

        // Scan all elements with sitekey-related attributes
        const allSitekeys: string[] = [];
        document.querySelectorAll('[sitekey], [data-sitekey], [ng-reflect-site-key]').forEach(el => {
          ['sitekey', 'data-sitekey', 'ng-reflect-site-key'].forEach(attr => {
            const v = el.getAttribute(attr);
            if (v) allSitekeys.push(v);
          });
        });

        return { invalids, iframes, cfSitekey, scriptKeys, allSitekeys, captchaHtml, scriptSrcs };
      });

      this.logger.log(`[DEBUG] ng-invalid: ${JSON.stringify(domDebug.invalids)}`);
      this.logger.log(`[DEBUG] iframes: ${JSON.stringify(domDebug.iframes)}`);
      this.logger.log(`[DEBUG] DOM sitekey: ${domDebug.cfSitekey}`);
      this.logger.log(`[DEBUG] allSitekeys: ${JSON.stringify(domDebug.allSitekeys)}`);
      this.logger.log(`[DEBUG] inline script keys: ${JSON.stringify(domDebug.scriptKeys)}`);
      this.logger.log(`[DEBUG] app-captcha: ${domDebug.captchaHtml}`);
      this.logger.log(`[DEBUG] script srcs (first 5): ${JSON.stringify(domDebug.scriptSrcs.slice(0, 5))}`);

      // Poll iframe src for up to 5s (it may populate after JS executes)
      let iframeSitekey: string | null = null;
      for (let i = 0; i < 10; i++) {
        await page.waitForTimeout(500);
        iframeSitekey = await page.evaluate(() => {
          const iframes = document.querySelectorAll('iframe');
          for (const f of iframes) {
            if (!f.src) continue;
            // sitekey is in URL path like /0x4.../
            const m = f.src.match(/\/(0x4[a-zA-Z0-9_-]+)\//);
            if (m) return m[1];
            // or as query param k=0x4...
            const u = new URL(f.src);
            const k = u.searchParams.get('k') || u.searchParams.get('sitekey');
            if (k) return k;
          }
          return null;
        });
        if (iframeSitekey) {
          this.logger.log(`[DEBUG] 🔑 Found sitekey in iframe src: ${iframeSitekey}`);
          break;
        }
      }

      // ==========================================
      // STEP 01c - Solve Cloudflare Turnstile
      // ==========================================
      if (capsolverKey) {
        if (applicationId) await this.updateAppStatus(applicationId, 'Solving Turnstile via CapSolver...');

        // Remove redundant network wait (already waited 12s above)
        // Priority: 0) initScript render-captured  1) network  2) iframe  3) script  4) DOM  5) hardcoded
        const sitekey = initScriptSitekey || capturedSitekey || iframeSitekey || domDebug.scriptKeys[0] || domDebug.cfSitekey || VFS_TURNSTILE_SITEKEY;
        const skSource = initScriptSitekey ? 'RENDER INTERCEPT ✅' : capturedSitekey ? 'NETWORK ✅' : iframeSitekey ? 'IFRAME ✅' : domDebug.scriptKeys[0] ? 'SCRIPT ✅' : domDebug.cfSitekey ? 'DOM' : 'HARDCODED ⚠️';
        this.logger.log(`[Step 01] Using Turnstile sitekey: ${sitekey} (${skSource})`);

        // If Turnstile already auto-solved (invisible mode), skip CapSolver
        let token: string | null = initScriptToken;
        if (token) {
          this.logger.log(`[Step 01] ✅ Turnstile auto-solved! Token already captured from initScript.`);
        } else {
          token = await this.solveTurnstileWithCapSolver(
            capsolverKey,
            targetUrl,
            sitekey,
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
          );
        }

        if (token) {
          this.logger.log(`[Step 01] Injecting Turnstile token into page...`);
          await page.evaluate((t: string) => {
            // Method 1: inject hidden input
            let input = document.querySelector('input[name="cf-turnstile-response"]') as HTMLInputElement;
            if (!input) {
              input = document.createElement('input');
              input.type = 'hidden';
              input.name = 'cf-turnstile-response';
              const form = document.querySelector('form');
              if (form) form.appendChild(input);
            }
            input.value = t;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));

            // Method 2: call intercepted callback
            if (typeof (window as any).__turnstileToken !== 'undefined') {
              (window as any).__turnstileToken = t;
            }

            // Method 3: call window.turnstile.execute callback if present
            try {
              const widgets = (window as any).__turnstileImpl?._state?.widgets;
              if (widgets) {
                Object.values(widgets).forEach((w: any) => {
                  if (typeof w?.callback === 'function') w.callback(t);
                });
              }
            } catch (_) {}
          }, token);

          await page.waitForTimeout(2000);
          this.logger.log(`[Step 01] Token injected. Waiting for Angular to validate...`);
          
          // Post-injection DOM check
          const afterInject = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.ng-invalid')).map(el => el.tagName + ' ' + el.className);
          });
          this.logger.log(`[DEBUG] After token injection ng-invalid: ${JSON.stringify(afterInject)}`);
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
      // Remove disabled from all buttons
      await page.evaluate(() => {
        document.querySelectorAll('button').forEach(b => b.removeAttribute('disabled'));
      });
      await page.waitForTimeout(500);

      try {
        await page.click(loginBtnSelector, { force: true });
        this.logger.log(`[Step 01] Clicked Login Button.`);
      } catch (_) {
        this.logger.warn(`[Step 01] Could not click login button — trying Enter key.`);
        await page.keyboard.press('Enter');
      }

      await page.waitForTimeout(6000);
      await page.screenshot({ path: '/app/debug-after-login.png' });
      this.logger.log(`[Step 01] Post-login screenshot saved to /app/debug-after-login.png`);

      const pageErrors = await page.evaluate(() => {
        const errors: string[] = [];
        document.querySelectorAll('mat-error, .c-brand-error, .alert, .toast-message, app-notification, .error-message').forEach(el => {
          const txt = el.textContent?.trim();
          if (txt) errors.push(txt);
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

import { Injectable, Logger } from '@nestjs/common';
import { Browser } from 'playwright';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class VfsAutomationService {
  private readonly logger = new Logger(VfsAutomationService.name);

  constructor(private prisma: PrismaService) {}

  // Alias for compatibility with your existing applications.service.ts
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
      // PROXY SETUP
      // ==========================================
      let proxyConfig = undefined;
      if (proxyString && proxyString.trim() !== '') {
        try {
           const url = new URL(proxyString.startsWith('http') ? proxyString : `http://${proxyString}`);
           const proxyServerStr = url.port ? `${url.protocol}//${url.hostname}:${url.port}` : `${url.protocol}//${url.hostname}`;
           proxyConfig = {
             server: proxyServerStr,
             username: url.username,
             password: url.password,
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
        '--disable-blink-features=AutomationControlled', // Evade basic bot detection
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
      const stealth = stealthPlugin();
      chromium.use(stealth);

      browser = await chromium.launch({
        headless: false, // Run headful to evade Cloudflare Turnstile bot detection
        proxy: proxyConfig,
        args: launchArgs,
      });

      if (!browser) throw new Error('Failed to launch browser');

      const page = await context.newPage();
      
      // ==========================================
      // STEP 00 - Verify Proxy and CapSolver
      // ==========================================
      this.logger.log(`[Step 00] Verifying Proxy IP...`);
      let proxyIp = 'Local/Direct';
      try {
          await page.goto('https://api.ipify.org?format=json', { waitUntil: 'domcontentloaded', timeout: 15000 });
          const ipText = await page.innerText('body');
          proxyIp = JSON.parse(ipText).ip;
          this.logger.log(`[Step 00] Connected Proxy IP: ${proxyIp}`);
      } catch(e) {
          this.logger.warn(`[Step 00] Could not fetch IP (Proxy might be slow or blocked).`);
      }

      let capBalance = 'N/A';
      const capsolverKey = process.env.CAPSOLVER_API_KEY;
      if (capsolverKey) {
          try {
              const balanceRes = await fetch('https://api.capsolver.com/getBalance', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ clientKey: capsolverKey })
              });
              const balanceData = await balanceRes.json() as any;
              capBalance = balanceData.balance || '0.00';
              this.logger.log(`[Step 00] CapSolver Balance: $${capBalance}`);
          } catch(e) {
              this.logger.warn(`[Step 00] Failed to fetch CapSolver balance.`);
          }
      }
      
      if (applicationId) {
          await this.updateAppStatus(applicationId, `IP: ${proxyIp} | CapSolver: $${capBalance}`);
      }

      // LOG API RESPONSES
      page.on('response', async (response) => {
         if (response.url().includes('/api/')) {
             try {
                this.logger.log(`[API RESPONSE] ${response.url()} : ${response.status()}`);
                const text = await response.text();
                this.logger.log(`[API BODY] ${text.substring(0, 500)}`);
             } catch (e) {}
         }
      });

      // Ensure we inject a script to intercept turnstile callback just in case CapSolver is used
      await page.addInitScript(() => {
        (window as any).turnstileCallback = null;
        const originalTurnstile = (window as any).turnstile;
        if (!originalTurnstile) {
           let turnstileOverrides: any = {};
           Object.defineProperty(window, 'turnstile', {
             get: () => turnstileOverrides,
             set: (val) => {
               const origRender = val.render;
               val.render = function(ele: any, options: any) {
                 if (options && options.callback) {
                   (window as any).turnstileCallback = options.callback;
                 }
                 return origRender.apply(this, [ele, options]);
               };
               turnstileOverrides = val;
             }
           });
        }
      });

      // ==========================================
      // STEP 01 - Login Page
      // ==========================================
      this.logger.log(`[Step 01] Navigating to Login Page: ${targetUrl}`);
      if (applicationId) await this.updateAppStatus(applicationId, 'Navigating to VFS Login...');
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
      
      // Wait for the page to render completely
      await page.waitForTimeout(5000); 

      this.logger.log(`[Step 01] Taking a screenshot of the login page to check for Cloudflare...`);
      await page.screenshot({ path: '/app/debug-login.png' });
      this.logger.log(`[Step 01] Screenshot saved to /app/debug-login.png`);

      const pageTitle = await page.title();
      this.logger.log(`[Step 01] PAGE TITLE IS: "${pageTitle}"`);
      
      // 1. Accept Cookies (force click)
      try {
        const btn = await page.waitForSelector('button:has-text("Accept All Cookies"), button#onetrust-accept-btn-handler', { timeout: 3000 });
        if (btn) {
          await btn.click({ force: true });
          this.logger.log(`[Step 01] Clicked "Accept All Cookies"`);
        }
      } catch (err) {
        this.logger.log(`[Step 01] No Cookie popup found or already accepted.`);
      }

      // Trying standard VFS login selectors
      const emailSelector = 'input[formcontrolname="username"]:not(.d-none), input#email, input#mat-input-0'; 
      const passwordSelector = 'input[formcontrolname="password"]:not(.d-none), input#password, input#mat-input-1';
      const loginBtnSelector = 'button:has-text("Sign in"), button:has-text("Login"), button.mat-raised-button.mat-primary';

      try {
        // Wait for form fields to render
        this.logger.log(`[Step 01] Waiting for form fields to render...`);
        await page.waitForSelector(emailSelector, { state: 'visible', timeout: 15000 });
        
        // Type slowly to trigger Angular validation
        await page.locator(emailSelector).pressSequentially(vfsEmail, { delay: 100 });
        await page.keyboard.press('Tab'); // trigger blur
        this.logger.log(`[Step 01] Entered Email.`);
        if (applicationId) await this.updateAppStatus(applicationId, 'Entering credentials...');
        
        await page.locator(passwordSelector).pressSequentially(vfsPassword, { delay: 100 });
        await page.keyboard.press('Tab'); // trigger blur
        this.logger.log(`[Step 01] Entered Password.`);

        await page.keyboard.press('Tab'); // trigger blur
        this.logger.log(`[Step 01] Entered Password.`);

        // DEBUG: Find exact invalid controls and errors
        const invalidDebug = await page.evaluate(() => {
           const invalidEls = Array.from(document.querySelectorAll('.ng-invalid'));
           const invalidNames = invalidEls.map(el => {
               return el.tagName.toLowerCase() + (el.getAttribute('formcontrolname') ? `[formcontrolname="${el.getAttribute('formcontrolname')}"]` : '') + ' class: ' + el.className;
           });
           
           const errorEls = Array.from(document.querySelectorAll('mat-error, .c-brand-error, .toast-message, .mat-mdc-form-field-error, app-captcha, .cf-turnstile'));
           const errorTexts = errorEls.map(el => el.tagName.toLowerCase() + ': ' + (el.textContent || el.innerHTML).trim());
           
           return { invalidNames, errorTexts };
        });
        this.logger.log(`[DEBUG] Invalid Elements: ${JSON.stringify(invalidDebug.invalidNames)}`);
        this.logger.log(`[DEBUG] Errors/Captcha tags: ${JSON.stringify(invalidDebug.errorTexts)}`);
        
        // DEBUG: Check Angular Context
        const ngContextStr = await page.evaluate(() => {
            try {
                const form = document.querySelector('form');
                if (!form) return 'No form';
                if ((window as any).ng) {
                    const ctx = (window as any).ng.getContext(form);
                    if (ctx) {
                        const controls = ctx.loginForm?.controls || ctx.form?.controls;
                        if (controls) {
                            return Object.keys(controls).map(k => `${k}:${controls[k].status}`).join(', ');
                        }
                    }
                }
                return 'ng context not found or no controls';
            } catch(e: any) {
                return e.message;
            }
        });
        this.logger.log(`[DEBUG] Angular Form Controls State: ${ngContextStr}`);

        // CHECK IF CAPSOLVER IS CONFIGURED
        const capsolverKey = process.env.CAPSOLVER_API_KEY;
        if (capsolverKey) {
          this.logger.log(`[Step 01] CAPSOLVER_API_KEY found. Attempting to solve Turnstile...`);
          if (applicationId) await this.updateAppStatus(applicationId, 'Solving Turnstile Captcha...');
          
          try {
            // Find sitekey by waiting for it to render
            let sitekey = await page.evaluate(async () => {
               const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
               for (let i = 0; i < 20; i++) {
                 // Try finding standard .cf-turnstile div
                 const cfEl = document.querySelector('.cf-turnstile, [data-sitekey]');
                 if (cfEl) {
                   const key = cfEl.getAttribute('data-sitekey');
                   if (key) return key;
                 }
                 
                 // Try extracting from any Turnstile iframe
                 const iframes = document.querySelectorAll('iframe');
                 for (let j = 0; j < iframes.length; j++) {
                   const src = iframes[j].getAttribute('src');
                   if (src && src.includes('turnstile')) {
                     // Look for k=...
                     const kMatch = src.match(/k=([^&]+)/);
                     if (kMatch) return kMatch[1];
                     // Look for typical path structure: /0x4AAAAAAA.../
                     const pathMatch = src.match(/\/(0x[a-zA-Z0-9_-]+)/);
                     if (pathMatch) return pathMatch[1];
                   }
                 }
                 await sleep(500);
               }
               return null;
            });

            if (sitekey) {
               this.logger.log(`[Step 01] Found Turnstile SiteKey: ${sitekey}. Requesting CapSolver...`);
               const taskPayload = {
                 clientKey: capsolverKey,
                 task: {
                   type: "AntiTurnstileTaskProxyLess",
                   websiteURL: targetUrl,
                   websiteKey: sitekey,
                 }
               };
               
               const createRes = await fetch('https://api.capsolver.com/createTask', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify(taskPayload)
               });
               const createTaskResult = await createRes.json() as any;
               
               if (createTaskResult.errorId > 0) {
                 throw new Error(createTaskResult.errorDescription);
               }
               
               const taskId = createTaskResult.taskId;
               let solutionToken = null;
               
               // Poll for result
               for (let i = 0; i < 24; i++) { // wait up to 2 mins
                 await page.waitForTimeout(5000);
                 const resultRes = await fetch('https://api.capsolver.com/getTaskResult', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ clientKey: capsolverKey, taskId })
                 });
                 const result = await resultRes.json() as any;
                 
                 if (result.status === 'ready') {
                   solutionToken = result.solution.token;
                   break;
                 } else if (result.status === 'processing') {
                   this.logger.log(`[Step 01] CapSolver is processing...`);
                   continue;
                 } else {
                   throw new Error(result.errorDescription);
                 }
               }
               
               if (solutionToken) {
                 this.logger.log(`[Step 01] CapSolver success! Injecting Turnstile token...`);
                 await page.evaluate((token) => {
                    let input = document.querySelector('input[name="cf-turnstile-response"]') as HTMLInputElement;
                    if (!input) {
                        input = document.createElement('input');
                        input.type = 'hidden';
                        input.name = 'cf-turnstile-response';
                        const form = document.querySelector('form');
                        if (form) form.appendChild(input);
                    }
                    if (input) {
                      input.value = token;
                      input.dispatchEvent(new Event('input', { bubbles: true }));
                      input.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    if (typeof (window as any).turnstileCallback === 'function') {
                      (window as any).turnstileCallback(token);
                    }
                 }, solutionToken);
                 await page.waitForTimeout(2000); // Give Angular time to react
               } else {
                 this.logger.warn(`[Step 01] CapSolver timed out.`);
               }
            } else {
               this.logger.warn(`[Step 01] Could not find Turnstile sitekey in DOM.`);
            }
          } catch (capErr: any) {
            this.logger.error(`[Step 01] CapSolver Error: ${capErr.message}`);
          }
        } else {
          // Wait for Cloudflare Turnstile to auto-solve naturally if no key
          this.logger.log(`[Step 01] Waiting 10 seconds for Cloudflare Turnstile to auto-solve (No CapSolver Key)...`);
          await page.waitForTimeout(10000);
        }
        
        // Force remove disabled attributes and click
        await page.evaluate(() => {
           document.querySelectorAll('button').forEach(b => b.removeAttribute('disabled'));
        });
        await page.waitForTimeout(500);
        await page.click(loginBtnSelector, { force: true });
        this.logger.log(`[Step 01] Clicked Login Button.`);
        
        // Fallback: try pressing Enter on the form
        await page.keyboard.press('Enter');

        // Ultimate Fallback: Execute Angular login component method directly
        await page.evaluate(() => {
            try {
                const form = document.querySelector('form');
                if (form && (window as any).ng) {
                    const ctx = (window as any).ng.getContext(form);
                    if (ctx) {
                        if (typeof ctx.login === 'function') ctx.login();
                        else if (typeof ctx.submit === 'function') ctx.submit();
                        else if (typeof ctx.onSubmit === 'function') ctx.onSubmit();
                    }
                }
            } catch(e) {}
        });
        
        // OPTIMIZATION: Wait for network to be idle after login, then save session
        await page.waitForTimeout(5000);
        await context.storageState({ path: '/app/vfs-session.json' });
        this.logger.log(`[Step 01] Saved browser session for faster future logins!`);
      } catch (err) {
        this.logger.warn(`[Step 01] Could not find login fields automatically. Check if Turnstile is active.`);
        const hasTurnstile = await page.$('iframe[src*="cloudflare"]');
        if (hasTurnstile) {
           this.logger.warn(`[Step 01] CLOUDFLARE TURNSTILE DETECTED! We need a captcha solver.`);
           if (applicationId) await this.updateAppStatus(applicationId, 'Blocked by Cloudflare Turnstile');
        }
        const pageHtml = await page.evaluate(() => document.body.innerHTML);
        this.logger.log(`[DEBUG] Page HTML snippet: ${pageHtml.substring(0, 3000)}...`);
        await page.screenshot({ path: '/app/debug-login-failed.png' });
        this.logger.log(`[DEBUG] Failed screenshot saved to /app/debug-login-failed.png`);
      }

      // ==========================================
      // STEP 02 - Dashboard
      // ==========================================
      this.logger.log(`[Step 02] Waiting for Dashboard...`);
      if (applicationId) await this.updateAppStatus(applicationId, 'Solving Captcha / Waiting for Dashboard...');
      const newBookingBtn = 'button:has-text("Start New Booking")';
      try {
        await page.waitForSelector(newBookingBtn, { timeout: 45000 });
        await page.click(newBookingBtn);
        this.logger.log(`[Step 02] Clicked "Start New Booking"`);
        if (applicationId) await this.updateAppStatus(applicationId, 'Logged In Successfully!');
      } catch (err) {
        this.logger.warn(`[Step 02] Could not find "Start New Booking". Stuck on Cloudflare or Loading?`);
        const pageTitle2 = await page.title();
        const pageHtml2 = await page.evaluate(() => document.body.innerHTML);
        this.logger.log(`[DEBUG-STEP-2] PAGE TITLE: "${pageTitle2}"`);
        this.logger.log(`[DEBUG-STEP-2] HTML snippet: ${pageHtml2.substring(0, 3000)}...`);
        await page.screenshot({ path: '/app/debug-dashboard-failed.png' });
      }
      
      // ==========================================
      // STEP 03 - Applicant Details / Category Selection
      // ==========================================
      this.logger.log(`[Step 03] Category Selection (Visa Center, Category, Sub-Category)...`);
      // TODO: Dynamic selection based on database configuration
      
      // ==========================================
      // STEP 04 - Date Availability
      // ==========================================
      this.logger.log(`[Step 04] Checking Date Availability / Applying Push Mechanism...`);
      
      // ==========================================
      // STEP 05 - Applicant Details / Passport Upload
      // ==========================================
      this.logger.log(`[Step 05] Processing Applicant Details...`);
      
      // ==========================================
      // STEP 06 - Face Verification
      // ==========================================
      this.logger.log(`[Step 06] Reached Face Verification. Virtual Camera will auto-inject media if configured.`);
      
      // ==========================================
      // STEP 07 - Booking Appointment Page
      // ==========================================
      this.logger.log(`[Step 07] Booking Date and Time Slot...`);

      // ==========================================
      // STEP 08 - Service Page
      // ==========================================
      this.logger.log(`[Step 08] Processing Additional Services...`);

      // ==========================================
      // STEP 09 & 10 - Review Page & Final Review
      // ==========================================
      this.logger.log(`[Step 09 & 10] Checking Terms & Conditions and Final Review...`);

      // ==========================================
      // STEP 11 - Payment / Completion
      // ==========================================
      this.logger.log(`[Step 11] Waiting for Booking Completion / Payment Page...`);

      // ------------------------------------------
      // Keeping browser open for local review
      // ------------------------------------------
      this.logger.log(`[TESTING] Keeping browser open for 5 minutes so you can inspect the flow...`);
      if (applicationId) await this.updateAppStatus(applicationId, 'Waiting (Inspect Browser)...');
      await page.waitForTimeout(300000); 
      
      return true;
    } catch (error: any) {
      this.logger.error(`VFS Automation failed: ${error.message}`, error.stack);
      if (applicationId) await this.updateAppStatus(applicationId, 'Failed / Blocked by Captcha');
      return false;
    } finally {
      if (browser) {
        // We will keep this commented out or managed via environment variable later so the browser doesn't close instantly on error
        await browser.close(); 
        this.logger.log(`Browser execution finished.`);
        if (applicationId) await this.updateAppStatus(applicationId, 'Finished');
      }
    }
  }
}

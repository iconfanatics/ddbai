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
        headless: true, // SET TO TRUE for Ubuntu VPS
        proxy: proxyConfig,
        args: launchArgs,
      });

      if (!browser) throw new Error('Failed to launch browser');

      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 },
      });

      const page = await context.newPage();
      
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
      
      const pageText = await page.evaluate(() => document.body.innerText.substring(0, 300));
      this.logger.log(`[Step 01] PAGE CONTENT PREVIEW: ${pageText.replace(/\n/g, ' ')}`);

      // 1. Accept Cookies
      try {
        const btn = await page.waitForSelector('button:has-text("Accept All Cookies"), button#onetrust-accept-btn-handler', { timeout: 5000 });
        if (btn) {
          await btn.click();
          this.logger.log(`[Step 01] Clicked "Accept All Cookies"`);
          await page.waitForTimeout(1000); // Wait for modal to close
        }
      } catch (err) {
        this.logger.log(`[Step 01] No Cookie popup found or already accepted.`);
      }

      // Trying standard VFS login selectors
      const emailSelector = 'input[type="text"], input[formcontrolname="username"], input[name="Email"], input[name="email"], input[id^="mat-input-"]'; 
      const passwordSelector = 'input[type="password"], input[formcontrolname="password"], input[name="Password"], input[name="password"]';
      const loginBtnSelector = 'button:has-text("Sign in"), button:has-text("Login"), button.mat-focus-indicator';

      try {
        // Wait for loading spinner to disappear if it exists
        this.logger.log(`[Step 01] Waiting for form fields to render...`);
        await page.waitForSelector(emailSelector, { timeout: 15000 });
        await page.fill(emailSelector, vfsEmail);
        this.logger.log(`[Step 01] Entered Email.`);
        if (applicationId) await this.updateAppStatus(applicationId, 'Entering credentials...');
        
        await page.fill(passwordSelector, vfsPassword);
        this.logger.log(`[Step 01] Entered Password.`);
        
        await page.click(loginBtnSelector);
        this.logger.log(`[Step 01] Clicked Login Button.`);
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

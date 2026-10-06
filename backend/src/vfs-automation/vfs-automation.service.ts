import { Injectable, Logger } from '@nestjs/common';
import { chromium, Browser } from 'playwright';

@Injectable()
export class VfsAutomationService {
  private readonly logger = new Logger(VfsAutomationService.name);

  // Alias for compatibility with your existing applications.service.ts
  async loginToVFS(
    vfsEmail: string,
    vfsPassword: string,
    proxyString: string,
    mediaVideoPath: string | null = null,
    targetUrl: string = 'https://visa.vfsglobal.com/bgd/en/prt/login', 
  ): Promise<boolean> {
    return this.processVfsApplication(vfsEmail, vfsPassword, proxyString, mediaVideoPath, targetUrl);
  }

  async processVfsApplication(
    vfsEmail: string,
    vfsPassword: string,
    proxyString: string,
    mediaVideoPath: string | null = null,
    targetUrl: string = 'https://visa.vfsglobal.com/bgd/en/prt/login', 
    applicationConfig?: any 
  ): Promise<boolean> {
    this.logger.log(`Starting VFS automation for ${vfsEmail} on ${targetUrl}`);
    let browser: Browser | null = null;
    
    try {
      // ==========================================
      // PROXY SETUP
      // ==========================================
      let proxyConfig = undefined;
      if (proxyString && proxyString.trim() !== '') {
        try {
           const url = new URL(proxyString.startsWith('http') ? proxyString : `http://${proxyString}`);
           proxyConfig = {
             server: `${url.protocol}//${url.hostname}:${url.port}`,
             username: url.username,
             password: url.password,
           };
           this.logger.log(`Using Proxy Server: ${proxyConfig.server}`);
        } catch (e) {
           this.logger.warn(`Invalid proxy format. Attempting without proxy. Error: ${e}`);
        }
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
      // LAUNCH BROWSER (Visible for Local Testing)
      // ==========================================
      browser = await chromium.launch({
        headless: false, // VISIBLE MODE: Set to true only in production (Ubuntu VPS)
        proxy: proxyConfig,
        args: launchArgs,
      });

      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 },
      });

      const page = await context.newPage();
      
      // ==========================================
      // STEP 01 - Login Page
      // ==========================================
      this.logger.log(`[Step 01] Navigating to Login Page: ${targetUrl}`);
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
      
      // Wait for the page to render completely
      await page.waitForTimeout(3000); 

      // Trying standard VFS login selectors
      const emailSelector = 'input[formcontrolname="username"], input[name="Email"], input[type="text"]'; 
      const passwordSelector = 'input[formcontrolname="password"], input[name="Password"], input[type="password"]';
      const loginBtnSelector = 'button:has-text("Sign in"), button:has-text("Login")';

      try {
        await page.waitForSelector(emailSelector, { timeout: 15000 });
        await page.fill(emailSelector, vfsEmail);
        this.logger.log(`[Step 01] Entered Email.`);
        
        await page.fill(passwordSelector, vfsPassword);
        this.logger.log(`[Step 01] Entered Password.`);

        // Note: If Cloudflare Captcha appears here, manual interaction or a 3rd party solver is needed.
        // For now, we click login and assume it passes or waits for the user locally.
        
        await page.click(loginBtnSelector);
        this.logger.log(`[Step 01] Clicked Login Button.`);
      } catch (err) {
        this.logger.warn(`[Step 01] Could not find login fields automatically. Manual intervention might be needed.`);
      }

      // ==========================================
      // STEP 02 - Dashboard
      // ==========================================
      this.logger.log(`[Step 02] Waiting for Dashboard...`);
      const newBookingBtn = 'button:has-text("Start New Booking")';
      try {
        await page.waitForSelector(newBookingBtn, { timeout: 45000 });
        await page.click(newBookingBtn);
        this.logger.log(`[Step 02] Clicked "Start New Booking"`);
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
      await page.waitForTimeout(300000); 
      
      return true;
    } catch (error: any) {
      this.logger.error(`VFS Automation failed: ${error.message}`, error.stack);
      return false;
    } finally {
      if (browser) {
        // We will keep this commented out or managed via environment variable later so the browser doesn't close instantly on error
        await browser.close(); 
        this.logger.log(`Browser execution finished.`);
      }
    }
  }
}

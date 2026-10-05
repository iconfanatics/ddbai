import { Test, TestingModule } from '@nestjs/testing';
import { VfsAutomationService } from './vfs-automation.service.js';

describe('VfsAutomationService', () => {
  let service: VfsAutomationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VfsAutomationService],
    }).compile();

    service = module.get<VfsAutomationService>(VfsAutomationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

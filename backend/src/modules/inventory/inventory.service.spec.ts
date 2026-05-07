import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InventoryService } from './inventory.service';
import { Product } from '../../database/entities/product.entity';
import { Inventory } from '../../database/entities/inventory.entity';
import { AppEventEmitter } from '../../common/events/app-event-emitter';

const mockProductRepo = { create: jest.fn(), save: jest.fn(), find: jest.fn(), findOne: jest.fn(), createQueryBuilder: jest.fn() };
const mockInventoryRepo = { create: jest.fn(), save: jest.fn(), findOne: jest.fn(), decrement: jest.fn(), increment: jest.fn() };
const mockEmitter = { emit: jest.fn(), on: jest.fn() };

describe('InventoryService', () => {
  let service: InventoryService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: getRepositoryToken(Product), useValue: mockProductRepo },
        { provide: getRepositoryToken(Inventory), useValue: mockInventoryRepo },
        { provide: AppEventEmitter, useValue: mockEmitter },
      ],
    }).compile();
    service = module.get(InventoryService);
  });

  it('should create product with inventory', async () => {
    const product = { id: 1, name: 'Rice', price: 200 };
    mockProductRepo.create.mockReturnValue(product);
    mockProductRepo.save.mockResolvedValue(product);
    mockInventoryRepo.create.mockReturnValue({ quantity: 50 });
    mockInventoryRepo.save.mockResolvedValue({ quantity: 50 });

    const result = await service.createProduct(1, { name: 'Rice', price: 200, initialStock: 50 } as any);
    expect(result.inventory).toBeDefined();
  });
});

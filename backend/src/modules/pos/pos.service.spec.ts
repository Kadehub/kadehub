import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PosService } from './pos.service';
import { Sale } from '../../database/entities/sale.entity';
import { SaleItem } from '../../database/entities/sale-item.entity';
import { CreditSale } from '../../database/entities/credit-sale.entity';
import { Inventory } from '../../database/entities/inventory.entity';
import { Product } from '../../database/entities/product.entity';
import { AppEventEmitter } from '../../common/events/app-event-emitter';

const mockSaleRepo = { create: jest.fn(), save: jest.fn(), findOne: jest.fn(), createQueryBuilder: jest.fn() };
const mockItemRepo = { create: jest.fn(), save: jest.fn() };
const mockCreditRepo = { create: jest.fn(), save: jest.fn() };
const mockInventoryRepo = { findOne: jest.fn(), increment: jest.fn() };
const mockProductRepo = { find: jest.fn() };
const mockEmitter = { emit: jest.fn(), on: jest.fn() };

describe('PosService', () => {
  let service: PosService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PosService,
        { provide: getRepositoryToken(Sale), useValue: mockSaleRepo },
        { provide: getRepositoryToken(SaleItem), useValue: mockItemRepo },
        { provide: getRepositoryToken(CreditSale), useValue: mockCreditRepo },
        { provide: getRepositoryToken(Inventory), useValue: mockInventoryRepo },
        { provide: getRepositoryToken(Product), useValue: mockProductRepo },
        { provide: AppEventEmitter, useValue: mockEmitter },
      ],
    }).compile();
    service = module.get(PosService);
  });

  it('should create a sale and emit event', async () => {
    const sale = { id: 1, total_amount: 500 };
    mockProductRepo.find.mockResolvedValue([{ id: 1, tenant_id: 1, price: 250 }]);
    mockInventoryRepo.findOne.mockResolvedValue({ product_id: 1, quantity: 10 });
    mockSaleRepo.create.mockReturnValue(sale);
    mockSaleRepo.save.mockResolvedValue(sale);
    mockItemRepo.create.mockReturnValue({});
    mockItemRepo.save.mockResolvedValue([]);
    mockSaleRepo.findOne.mockResolvedValue({ ...sale, items: [] });

    const dto = { items: [{ product_id: 1, quantity: 2, price: 250 }], payment_method: 'CASH' };
    const result = await service.createSale(1, 1, dto as any);

    expect(mockSaleRepo.save).toHaveBeenCalled();
    expect(mockEmitter.emit).toHaveBeenCalledWith('SALE_COMPLETED', expect.any(Object));
    expect(result).toBeDefined();
  });

  it('should reject items for a product that does not belong to the tenant', async () => {
    mockProductRepo.find.mockResolvedValue([]); // no matching product for this tenant
    const dto = { items: [{ product_id: 999, quantity: 1, price: 250 }], payment_method: 'CASH' };

    await expect(service.createSale(1, 1, dto as any)).rejects.toThrow('Product ID 999 not found');
  });
});

import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PosService } from './pos.service';
import { Sale } from '../../database/entities/sale.entity';
import { SaleItem } from '../../database/entities/sale-item.entity';
import { AppEventEmitter } from '../../common/events/app-event-emitter';

const mockSaleRepo = { create: jest.fn(), save: jest.fn(), findOne: jest.fn(), createQueryBuilder: jest.fn() };
const mockItemRepo = { create: jest.fn(), save: jest.fn() };
const mockEmitter = { emit: jest.fn(), on: jest.fn() };

describe('PosService', () => {
  let service: PosService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PosService,
        { provide: getRepositoryToken(Sale), useValue: mockSaleRepo },
        { provide: getRepositoryToken(SaleItem), useValue: mockItemRepo },
        { provide: AppEventEmitter, useValue: mockEmitter },
      ],
    }).compile();
    service = module.get(PosService);
  });

  it('should create a sale and emit event', async () => {
    const sale = { id: 1, total_amount: 500 };
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
});

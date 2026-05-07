import {
  Controller, Get, Post, Patch, Body, Param, UseGuards,
  UsePipes, ValidationPipe, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { InventoryService } from './inventory.service';
import { CreateProductDto, UpdateProductDto, AdjustStockDto } from './inventory.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { uploadToCloudinary } from '../../common/cloudinary';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ whitelist: true }))
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get('products')
  getProducts(@CurrentUser() user: any) {
    return this.inventoryService.getProducts(user.tenant_id);
  }

  @Get('products/barcode/:barcode')
  getByBarcode(@CurrentUser() user: any, @Param('barcode') barcode: string) {
    return this.inventoryService.getProductByBarcode(user.tenant_id, barcode);
  }

  @Post('products/csv-import')
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!file.originalname.match(/\.csv$/i)) return cb(new Error('Only CSV files allowed'), false);
      cb(null, true);
    },
  }))
  importCsv(@CurrentUser() user: any, @UploadedFile() file: Express.Multer.File) {
    return this.inventoryService.importFromCsv(user.tenant_id, file.buffer);
  }

  @Post('products')
  @Roles('ADMIN')
  createProduct(@CurrentUser() user: any, @Body() dto: CreateProductDto) {
    return this.inventoryService.createProduct(user.tenant_id, dto);
  }

  @Patch('products/:id')
  @Roles('ADMIN')
  updateProduct(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.inventoryService.updateProduct(+id, user.tenant_id, dto);
  }

  @Post('products/:id/image')
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('image', {
    storage: memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.match(/^image\/(jpeg|png|webp|gif)$/)) {
        return cb(new Error('Only image files are allowed'), false);
      }
      cb(null, true);
    },
  }))
  async uploadImage(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const imageUrl = await uploadToCloudinary(file.buffer, 'kadehub/products', file.originalname);
    return this.inventoryService.updateProductImage(+id, user.tenant_id, imageUrl);
  }

  @Patch('products/:id/stock')
  @Roles('ADMIN')
  adjustStock(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: AdjustStockDto) {
    return this.inventoryService.adjustStock(+id, user.tenant_id, dto);
  }

  @Get('low-stock')
  getLowStock(@CurrentUser() user: any) {
    return this.inventoryService.getLowStock(user.tenant_id);
  }
}

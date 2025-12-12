import { db } from '@/lib/db';
import { Product, PriceHistory, Prisma } from '@prisma/client';

export type ProductWithPriceHistory = Product & {
  priceHistory: PriceHistory[];
};

export type CreateProductInput = {
  url: string;
  name: string;
  currentPrice: number;
  targetPrice?: number;
  imageUrl?: string;
  userId: string;
};

export type UpdateProductInput = Partial<Omit<CreateProductInput, 'userId' | 'url'>>;

export const productRepository = {
  async findById(id: string): Promise<Product | null> {
    return db.product.findUnique({
      where: { id },
    });
  },

  async findByIdWithHistory(id: string): Promise<ProductWithPriceHistory | null> {
    return db.product.findUnique({
      where: { id },
      include: {
        priceHistory: {
          orderBy: { checkedAt: 'desc' },
          take: 100,
        },
      },
    });
  },

  async findByUserId(userId: string): Promise<Product[]> {
    return db.product.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findByUserIdWithHistory(userId: string): Promise<ProductWithPriceHistory[]> {
    return db.product.findMany({
      where: { userId },
      include: {
        priceHistory: {
          orderBy: { checkedAt: 'desc' },
          take: 10,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findByUrl(url: string, userId: string): Promise<Product | null> {
    return db.product.findFirst({
      where: { url, userId },
    });
  },

  async findAllActive(): Promise<Product[]> {
    return db.product.findMany({
      where: { isActive: true },
    });
  },

  async create(data: CreateProductInput): Promise<Product> {
    return db.product.create({
      data: {
        url: data.url,
        name: data.name,
        currentPrice: data.currentPrice,
        targetPrice: data.targetPrice,
        imageUrl: data.imageUrl,
        userId: data.userId,
        isActive: true,
      },
    });
  },

  async update(id: string, data: UpdateProductInput): Promise<Product> {
    return db.product.update({
      where: { id },
      data,
    });
  },

  async updatePrice(id: string, newPrice: number): Promise<Product> {
    return db.product.update({
      where: { id },
      data: {
        currentPrice: newPrice,
        lastCheckedAt: new Date(),
      },
    });
  },

  async delete(id: string): Promise<Product> {
    return db.product.delete({
      where: { id },
    });
  },

  async countByUserId(userId: string): Promise<number> {
    return db.product.count({
      where: { userId },
    });
  },

  async deactivate(id: string): Promise<Product> {
    return db.product.update({
      where: { id },
      data: { isActive: false },
    });
  },

  async activate(id: string): Promise<Product> {
    return db.product.update({
      where: { id },
      data: { isActive: true },
    });
  },
};

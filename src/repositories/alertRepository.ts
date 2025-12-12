import { db } from '@/lib/db';
import { Alert, AlertType, Prisma } from '@prisma/client';

export type CreateAlertInput = {
  productId: string;
  userId: string;
  type: AlertType;
  threshold?: number;
};

export type UpdateAlertInput = Partial<Omit<CreateAlertInput, 'userId' | 'productId'>>;

export type AlertWithProduct = Alert & {
  product: {
    id: string;
    name: string;
    url: string;
    currentPrice: number;
    imageUrl: string | null;
  };
};

export const alertRepository = {
  async findById(id: string): Promise<Alert | null> {
    return db.alert.findUnique({
      where: { id },
    });
  },

  async findByIdWithProduct(id: string): Promise<AlertWithProduct | null> {
    return db.alert.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            url: true,
            currentPrice: true,
            imageUrl: true,
          },
        },
      },
    });
  },

  async findByUserId(userId: string): Promise<Alert[]> {
    return db.alert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findByUserIdWithProduct(userId: string): Promise<AlertWithProduct[]> {
    return db.alert.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            url: true,
            currentPrice: true,
            imageUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findByProductId(productId: string): Promise<Alert[]> {
    return db.alert.findMany({
      where: { productId },
    });
  },

  async findActiveByProductId(productId: string): Promise<Alert[]> {
    return db.alert.findMany({
      where: {
        productId,
        isActive: true,
      },
    });
  },

  async findAllActive(): Promise<AlertWithProduct[]> {
    return db.alert.findMany({
      where: { isActive: true },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            url: true,
            currentPrice: true,
            imageUrl: true,
          },
        },
      },
    });
  },

  async create(data: CreateAlertInput): Promise<Alert> {
    return db.alert.create({
      data: {
        productId: data.productId,
        userId: data.userId,
        type: data.type,
        threshold: data.threshold,
        isActive: true,
      },
    });
  },

  async update(id: string, data: UpdateAlertInput): Promise<Alert> {
    return db.alert.update({
      where: { id },
      data,
    });
  },

  async delete(id: string): Promise<Alert> {
    return db.alert.delete({
      where: { id },
    });
  },

  async deleteByProductId(productId: string): Promise<Prisma.BatchPayload> {
    return db.alert.deleteMany({
      where: { productId },
    });
  },

  async countByUserId(userId: string): Promise<number> {
    return db.alert.count({
      where: { userId },
    });
  },

  async countActiveByUserId(userId: string): Promise<number> {
    return db.alert.count({
      where: {
        userId,
        isActive: true,
      },
    });
  },

  async deactivate(id: string): Promise<Alert> {
    return db.alert.update({
      where: { id },
      data: { isActive: false },
    });
  },

  async markAsTriggered(id: string): Promise<Alert> {
    return db.alert.update({
      where: { id },
      data: {
        triggeredAt: new Date(),
        isActive: false,
      },
    });
  },
};

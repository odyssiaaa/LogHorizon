import { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function createNotification({
  userId,
  type,
  message,
  link,
}: {
  userId: string;
  type: NotificationType;
  message: string;
  link?: string;
}) {
  try {
    return await prisma.notification.create({
      data: {
        userId,
        type,
        message,
        link,
      },
    });
  } catch (error) {
    console.error("[notifications] Failed to create notification:", error);
    return null;
  }
}

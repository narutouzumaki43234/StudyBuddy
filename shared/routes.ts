import { z } from 'zod';
import { insertTaskSchema, tasks } from './schema';

export const api = {
  chat: {
    message: {
      method: 'POST' as const,
      path: '/api/chat',
      input: z.object({
        message: z.string(),
      }),
      responses: {
        200: z.object({
          message: z.string(),
          task: z.object({
            title: z.string(),
            description: z.string(),
            timeLimit: z.number(),
          }).optional(),
        }),
        500: z.object({ message: z.string() }),
      },
    },
  },
  tasks: {
    list: {
      method: 'GET' as const,
      path: '/api/tasks',
      responses: {
        200: z.array(z.custom<typeof tasks.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/tasks',
      input: insertTaskSchema,
      responses: {
        201: z.custom<typeof tasks.$inferSelect>(),
        400: z.object({ message: z.string() }),
      },
    },
    complete: {
      method: 'PATCH' as const,
      path: '/api/tasks/:id/complete',
      responses: {
        200: z.custom<typeof tasks.$inferSelect>(),
        404: z.object({ message: z.string() }),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/tasks/:id',
      responses: {
        204: z.void(),
        404: z.object({ message: z.string() }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

import { AuthManager } from '@/auth/AuthManager';

export function RequiresAuth(_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (this: any, ...args: any[]) {
    try {
      const token = await AuthManager.getToken();

      if (this.axiosInstance) {
        this.axiosInstance.defaults.headers.Authorization = `Bearer ${token}`;
      }

      return await originalMethod.apply(this, args);
    } catch (error) {
      AuthManager.clearToken();
      throw error;
    }
  };

  return descriptor;
}
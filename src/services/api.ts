import axios from 'axios';
import { UserType, JobType, ChatType, MessageType, FileType } from '@/types';

// Configurando la instancia de axios
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Interceptor para agregar token de autorización
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Servicios de usuario
export const userService = {
  async getUsers(): Promise<UserType[]> {
    const response = await api.get('/users');
    if (response.data.success) {
      return response.data.users;
    }
    throw new Error(response.data.message || 'Error getting users');
  },

  async getUserById(userId: string): Promise<UserType> {
    const response = await api.get(`/users/${userId}`);
    if (response.data.success) {
      return response.data.user;
    }
    throw new Error(response.data.message || 'User not found');
  },

  async updateUserProfile(userId: string, userData: Partial<UserType>): Promise<UserType> {
    const response = await api.put(`/users/${userId}`, userData);
    if (response.data.success) {
      return response.data.user;
    }
    throw new Error(response.data.message || 'Error updating profile');
  }
};

// Servicios de trabajos
export const jobService = {
  async getAllJobs(): Promise<JobType[]> {
    const response = await api.get('/jobs');
    return response.data;
  },
  
  async getJobById(jobId: string): Promise<JobType> {
    const response = await api.get(`/jobs/${jobId}`);
    return response.data;
  },
  
  async createJob(jobData: Partial<JobType>): Promise<JobType> {
    const response = await api.post('/jobs', jobData);
    return response.data;
  },
  
  async updateJob(jobId: string, jobData: Partial<JobType>): Promise<JobType> {
    const response = await api.put(`/jobs/${jobId}`, jobData);
    return response.data;
  },
  
  async deleteJob(jobId: string): Promise<void> {
    await api.delete(`/jobs/${jobId}`);
  },
  
  async applyToJob(jobId: string): Promise<void> {
    await api.post(`/jobs/${jobId}/apply`);
  },
  
  async toggleSavedJob(jobId: string): Promise<{ message: string }> {
    const response = await api.post(`/jobs/${jobId}/toggle-save`);
    return response.data;
  },
  
  async getSavedJobs(): Promise<JobType[]> {
    const response = await api.get('/jobs/saved');
    return response.data;
  },
  
  async getAppliedJobs(): Promise<JobType[]> {
    const response = await api.get('/jobs/applied');
    return response.data;
  },
  
  async getPostedJobs(): Promise<JobType[]> {
    const response = await api.get('/jobs/posted');
    return response.data;
  },
  
  async getJobApplicants(jobId: string): Promise<UserType[]> {
    const response = await api.get(`/jobs/${jobId}/applicants`);
    return response.data;
  },
  
  async updateJobStatus(jobId: string, status: string): Promise<JobType> {
    const response = await api.put(`/jobs/${jobId}/status`, { status });
    return response.data;
  }
};

// Servicios de chats
export const chatService = {
  async getChats(): Promise<ChatType[]> {
    const response = await api.get('/chats');
    return response.data;
  },
  
  async getChatById(chatId: string): Promise<ChatType> {
    const response = await api.get(`/chats/${chatId}`);
    return response.data;
  },
  
  async createGroupChat(name: string, participantIds: string[]): Promise<ChatType> {
    const response = await api.post('/chats/group', { name, participants: participantIds });
    return response.data;
  },
  
  async createPrivateChat(userId: string): Promise<ChatType> {
    const response = await api.post('/chats/private', { userId });
    return response.data;
  },
  
  async deleteChat(chatId: string): Promise<void> {
    await api.delete(`/chats/${chatId}`);
  },
  
  async addUsersToChat(chatId: string, userIds: string[]): Promise<void> {
    await api.post(`/chats/${chatId}/participants`, { userIds });
  },
  
  async removeUserFromChat(chatId: string, userId: string): Promise<void> {
    await api.delete(`/chats/${chatId}/participants/${userId}`);
  }
};

// Servicios de mensajes
export const messageService = {
  async getMessages(chatId: string): Promise<MessageType[]> {
    const response = await api.get(`/messages/${chatId}`);
    return response.data;
  },
  
  async sendMessage(chatId: string, content: string): Promise<MessageType> {
    const response = await api.post('/messages', { chatId, content });
    return response.data;
  },
  
  async updateMessage(messageId: string, text: string): Promise<MessageType> {
    const response = await api.put(`/messages/${messageId}`, { text });
    return response.data;
  },
  
  async deleteMessage(messageId: string): Promise<void> {
    await api.delete(`/messages/${messageId}`);
  },
  
  async searchMessages(query: string): Promise<MessageType[]> {
    const response = await api.get(`/messages/search?query=${encodeURIComponent(query)}`);
    return response.data;
  },
  
  async searchMessagesInChat(chatId: string, search: string): Promise<MessageType[]> {
    const response = await api.get(`/messages/${chatId}?search=${encodeURIComponent(search)}`);
    return response.data;
  }
};

// Servicios de archivos
export const fileService = {
  async uploadFile(chatId: string, file: File): Promise<FileType> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('chatId', chatId);
    
    // Convertir archivo a base64
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Extraer solo la parte base64 (quitar el prefijo "data:tipo/subtipo;base64,")
          resolve(reader.result.split(',')[1]);
        } else {
          reject(new Error('No se pudo leer el archivo como string'));
        }
      };
      reader.onerror = (error) => reject(error);
    });
    
    // Enviar datos del archivo
    const response = await api.post('/files', {
      filename: file.name,
      contentType: file.type,
      size: file.size,
      data: base64Data,
      chatId
    });
    
    return response.data;
  },
  
  async getFile(fileId: string): Promise<Blob> {
    const response = await api.get(`/files/${fileId}`, {
      responseType: 'blob'
    });
    return response.data;
  },
  
  async deleteFile(fileId: string): Promise<void> {
    await api.delete(`/files/${fileId}`);
  },
  
  getFileUrl(fileId: string): string {
    const token = localStorage.getItem('token');
    return `http://localhost:5000/api/files/${fileId}?token=${token}`;
  },

  // Helper function to format file size
  formatFileSize(bytes: number | undefined): string {
    if (!bytes || bytes === 0) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }
};

// Servicios de autenticación
export const authService = {
  async login(email: string, password: string): Promise<{ user: UserType; token: string }> {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.success) {
      return response.data;
    }
    throw new Error(response.data.message || 'Login failed');
  },
  
  async register(userData: {
    email: string;
    password: string;
    username: string;
    role?: string;
  }): Promise<{ user: UserType; token: string }> {
    const response = await api.post('/auth/register', userData);
    if (response.data.success) {
      return response.data;
    }
    throw new Error(response.data.message || 'Registration failed');
  },
  
  async verifyToken(): Promise<UserType> {
    const response = await api.get('/auth/verify');
    if (response.data.success) {
      return response.data.user;
    }
    throw new Error(response.data.message || 'Token verification failed');
  }
};

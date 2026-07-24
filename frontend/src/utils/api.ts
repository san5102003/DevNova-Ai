const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8080/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const api = {
  auth: {
    signin: async (usernameOrEmail: string, password: string) => {
      const res = await fetch(`${API_BASE_URL}/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail, password })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Login failed');
      }
      return res.json();
    },
    signup: async (username: string, email: string, password: string) => {
      const res = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Signup failed');
      }
      return res.json();
    },
    forgotPassword: async (email: string) => {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to send OTP');
      }
      return res.json();
    },
    verifyOtp: async (email: string, otp: string) => {
      const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'OTP verification failed');
      }
      return res.json();
    },
    resetPasswordOtp: async (email: string, otp: string, newPassword: string, confirmPassword: string) => {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword, confirmPassword })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Password update failed');
      }
      return res.json();
    },
    resetPassword: async (email: string, newPassword: string) => {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: '', newPassword })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Password reset failed');
      }
      return res.json();
    }
  },
  projects: {
    list: async () => {
      const res = await fetch(`${API_BASE_URL}/projects`, {
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Failed to fetch projects');
      return res.json();
    },
    get: async (id: string) => {
      const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Failed to fetch project details');
      return res.json();
    },
    create: async (name: string, description: string, language: string = 'python') => {
      const res = await fetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ name, description, language })
      });
      if (!res.ok) throw new Error('Failed to create project');
      return res.json();
    },
    delete: async (id: string) => {
      const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Failed to delete project');
      return res.json();
    },
    saveFile: async (projectId: string, file: { id?: string; name: string; path: string; content: string }) => {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/files`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(file)
      });
      if (!res.ok) throw new Error('Failed to save file');
      return res.json();
    },
    deleteFile: async (projectId: string, fileId: string) => {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/files/${fileId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Failed to delete file');
      return res.json();
    },
    run: async (projectId: string, language: string, mainFileName: string, stdin: string) => {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/run`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ language, mainFileName, stdin })
      });
      if (!res.ok) throw new Error('Failed to execute code');
      return res.json();
    }
  },
  ai: {
    explain: async (projectId: string, language: string, mainFileName: string, errorLog: string) => {
      const res = await fetch(`${API_BASE_URL}/ai/explain`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ projectId, language, mainFileName, errorLog })
      });
      if (!res.ok) throw new Error('Failed to get AI error explanation');
      return res.json();
    },
    autofix: async (projectId: string, language: string, mainFileName: string, errorLog: string) => {
      const res = await fetch(`${API_BASE_URL}/ai/autofix`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ projectId, language, mainFileName, errorLog })
      });
      if (!res.ok) throw new Error('Failed to get AI auto fix patches');
      return res.json();
    },
    chat: async (projectId: string, chatHistory: string, prompt: string) => {
      const res = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ projectId, chatHistory, prompt })
      });
      if (!res.ok) throw new Error('Failed to get AI chat response');
      return res.json();
    },
    complexity: async (projectId: string, language: string, mainFileName: string) => {
      const res = await fetch(`${API_BASE_URL}/ai/complexity`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ projectId, language, mainFileName })
      });
      if (!res.ok) throw new Error('Failed to analyze code complexity');
      return res.json();
    },
    testcases: async (projectId: string, language: string, mainFileName: string) => {
      const res = await fetch(`${API_BASE_URL}/ai/testcases`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ projectId, language, mainFileName })
      });
      if (!res.ok) throw new Error('Failed to generate test cases');
      return res.json();
    },
    review: async (projectId: string, language: string, mainFileName: string) => {
      const res = await fetch(`${API_BASE_URL}/ai/review`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ projectId, language, mainFileName })
      });
      if (!res.ok) throw new Error('Failed to generate code review');
      return res.json();
    },
    getHistory: async (projectId: string) => {
      const res = await fetch(`${API_BASE_URL}/ai/history/${projectId}`, {
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Failed to fetch AI history');
      return res.json();
    }
  }
};

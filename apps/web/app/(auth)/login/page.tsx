'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';

export default function LoginPage() {
  const router = useRouter();
  const setTokens = useAppStore((s) => s.setTokens);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const body = isRegister ? { email, password, name } : { email, password };

      const data = await api.post<{ accessToken: string; refreshToken: string }>(
        endpoint,
        body,
      );
      setTokens(data.accessToken, data.refreshToken);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Ошибка авторизации');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-[22px] shadow-card p-[28px]">
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-feature text-primary font-extrabold text-xl">
            К
          </div>
          <h1 className="text-[20px] font-extrabold">
            {isRegister ? 'Регистрация' : 'Вход'}
          </h1>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {isRegister && (
            <input
              placeholder="Имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-border rounded-[11px] px-3 py-2.5 text-[13.5px] bg-card outline-none focus:border-ring focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_35%,transparent)]"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-border rounded-[11px] px-3 py-2.5 text-[13.5px] bg-card outline-none focus:border-ring focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_35%,transparent)]"
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full border border-border rounded-[11px] px-3 py-2.5 text-[13.5px] bg-card outline-none focus:border-ring focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_35%,transparent)]"
          />
          {error && (
            <p className="text-[13px] text-destructive">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center bg-primary text-primary-foreground font-bold text-[13px] rounded-xl px-4 py-2.5 hover:brightness-95 transition-all disabled:opacity-50"
          >
            {loading
              ? 'Загрузка...'
              : isRegister
                ? 'Зарегистрироваться'
                : 'Войти'}
          </button>
        </form>
        <button
          className="mt-3 w-full text-center text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors bg-transparent border-0"
          onClick={() => {
            setIsRegister(!isRegister);
            setError('');
          }}
        >
          {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Регистрация'}
        </button>
      </div>
    </div>
  );
}

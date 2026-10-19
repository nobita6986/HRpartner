import type { Metadata } from 'next';
import RegisterForm from './register-form';

export const metadata: Metadata = { title: 'Đăng ký tài khoản' };

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: 'var(--background)' }}>
      <RegisterForm />
    </main>
  );
}

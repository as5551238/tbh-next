import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex h-screen items-center justify-center bg-bg">
      <div className="max-w-md text-center">
        <div className="text-6xl font-extrabold text-primary mb-2">404</div>
        <h1 className="text-xl font-bold text-text mb-2">页面未找到</h1>
        <p className="text-sm text-text-3 mb-6">你访问的页面不存在，可能已被移除或地址有误。</p>
        <Link
          to="/"
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-80"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}

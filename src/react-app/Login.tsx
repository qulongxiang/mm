import { useState } from 'react';

interface LoginProps {
  onLogin: (token: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '登录失败');
      }

      onLogin(data.token);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-info">
          <div className="login-brand">
            <p className="eyebrow">成绩洞察平台</p>
            <h2>智慧学情 · 深度分析 · 高效维护</h2>
            <p className="login-description">
              登录进入成绩管理中心，快速查看学情趋势、学科对比、排名洞察以及成绩维护工具。
            </p>
            <div className="login-features">
              <div className="feature-item">⚡ 快速登录</div>
              <div className="feature-item">🔒 安全验证</div>
              <div className="feature-item">📊 智能分析</div>
              <div className="feature-item">📝 数据维护</div>
            </div>
          </div>
        </div>

        <div className="login-form-card">
          <h2>欢迎登录</h2>
          <p>请输入邮箱和密码，开始查看你的成绩分析与学情报告。</p>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">邮箱</label>
              <input
                type="email"
                id="email"
                placeholder="请输入邮箱地址"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">密码</label>
              <input
                type="password"
                id="password"
                placeholder="请输入登录密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={loading}>
              {loading ? '登录中...' : '登录'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;

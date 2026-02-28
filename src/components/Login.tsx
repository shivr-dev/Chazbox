import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyLogin } from '../lib/githubAuth';
import { useAuthStore } from '../store/authStore';
import { soundManager } from '../utils/soundManager';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    soundManager.play('sounds_button');
    setLoading(true);
    setError('');

    try {
      const result = await verifyLogin(username, password);
      if (result.success && result.role) {
        login({ username, role: result.role });
        soundManager.play('toast');
        navigate('/chat');
      } else {
        setError(result.message || 'Login failed');
        soundManager.play('sounds_click');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      soundManager.play('sounds_click');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[url('/images/dirt_background.png')] bg-repeat bg-center" style={{ imageRendering: 'pixelated' }}>
      <div className="ore-panel p-8 max-w-md w-full mx-4">
        <h1 className="text-4xl text-center mb-6 font-mc-ten text-white drop-shadow-md">
          MINECRAFT CHAT
        </h1>
        <h2 className="text-xl text-center mb-8 font-mc-five text-ore-text-muted">
          LOGIN TO CONTINUE
        </h2>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-mc-five mb-2 text-ore-text-muted">
              USERNAME (游戏 ID)
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                soundManager.play('sounds_click');
              }}
              className="ore-input w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-mc-five mb-2 text-ore-text-muted">
              PASSWORD (生成密码)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                soundManager.play('sounds_click');
              }}
              className="ore-input w-full"
              required
            />
          </div>

          {error && (
            <div className="text-red-400 font-mc-ae text-sm bg-red-900/50 p-3 border border-red-500 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="ore-btn w-full py-3 text-lg mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'LOGGING IN...' : 'LOGIN'}
          </button>
        </form>
      </div>
    </div>
  );
}

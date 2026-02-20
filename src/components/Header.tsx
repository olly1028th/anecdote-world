import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="no-underline">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            Anecdote World
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Life is short and the world is wide.
          </p>
        </Link>
      </div>
    </header>
  );
}

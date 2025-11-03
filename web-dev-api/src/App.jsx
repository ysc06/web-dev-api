import { useEffect, useMemo, useState } from 'react';


const API_BASE = 'https://api.spoonacular.com';


const API_KEY = import.meta.env.VITE_APP_API_KEY; 


export default function App() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI state
  const [query, setQuery] = useState('');        // live search (title)
  const [diet, setDiet] = useState('all');       // extra filter

  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);

        if (!API_KEY) {
          throw new Error('Missing API key. Put it in .env as VITE_APP_API_KEY and restart `npm run dev`.');
        }

        const params = new URLSearchParams({
          apiKey: API_KEY,
          number: '50',                  // fetch plenty so we can filter locally
          sort: 'popularity',
          addRecipeInformation: 'true',  // include readyInMinutes, healthScore, diets, cuisines...
        });

        
        const url = `${API_BASE}/recipes/complexSearch?${params.toString()}`;

        const res = await fetch(url, { signal: ac.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        setRecipes(Array.isArray(json.results) ? json.results : []);
      } catch (e) {
        if (e.name !== 'AbortError') setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, []);

  // Client-side filtering
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return recipes.filter(r => {
      const title = (r.title || '').toLowerCase();
      const matchQ = q === '' || title.includes(q);

      if (diet === 'all') return matchQ;

      // Diet comes from booleans or "diets" array; handle both.
      const flags = {
        vegetarian: !!r.vegetarian || (r.diets || []).includes('vegetarian'),
        vegan: !!r.vegan || (r.diets || []).includes('vegan'),
        glutenFree: !!r.glutenFree || (r.diets || []).includes('gluten free'),
      };

      const matchDiet =
        (diet === 'vegetarian' && flags.vegetarian) ||
        (diet === 'vegan' && flags.vegan) ||
        (diet === 'glutenFree' && flags.glutenFree);

      return matchQ && matchDiet;
    });
  }, [recipes, query, diet]);

  // Summary statistics for the currently filtered set
  const stats = useMemo(() => {
    const total = filtered.length;

    const ready = filtered
      .map(r => Number(r.readyInMinutes))
      .filter(n => Number.isFinite(n));
    const avgReady =
      ready.length ? (ready.reduce((a, b) => a + b, 0) / ready.length).toFixed(1) : '—';

    const hs = filtered
      .map(r => Number(r.healthScore))
      .filter(n => Number.isFinite(n))
      .sort((a, b) => a - b);
    const medianHS = hs.length
      ? (hs.length % 2
          ? hs[(hs.length - 1) / 2]
          : ((hs[hs.length / 2 - 1] + hs[hs.length / 2]) / 2).toFixed(1))
      : '—';

    const cuisines = new Set(
      filtered.flatMap(r => Array.isArray(r.cuisines) ? r.cuisines : []).filter(Boolean)
    ).size || '—';

    return { total, avgReady, medianHS, cuisines };
  }, [filtered]);

  if (loading) {
    return <div className="container"><p>Loading…</p></div>;
  }
  if (error) {
    return <div className="container"><p role="alert">Error: {error}</p></div>;
  }

  return (
    <div className="container">
      <header className="header">
        <h1>Recipe Data Dashboard</h1>
        <p className="sub">Spoonacular public API · Search and filter recipes</p>
      </header>

      {/* Stats */}
      <section className="stats">
        <div className="stat">
          <div className="stat-label">Recipes</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Avg ready time (min)</div>
          <div className="stat-value">{stats.avgReady}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Median health score</div>
          <div className="stat-value">{stats.medianHS}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Distinct cuisines</div>
          <div className="stat-value">{stats.cuisines}</div>
        </div>
      </section>

      {/* Controls */}
      <section className="controls">
        <input
          className="input"
          placeholder="Search by title (live)…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <select
          className="select"
          value={diet}
          onChange={e => setDiet(e.target.value)}
          aria-label="Diet filter"
        >
          <option value="all">All diets</option>
          <option value="vegetarian">Vegetarian</option>
          <option value="vegan">Vegan</option>
          <option value="glutenFree">Gluten Free</option>
        </select>
      </section>

      {/* List */}
      <section className="list">
        <div className="list-head row">
          <div>Recipe</div>
          <div>Ready (min)</div>
          <div>Servings</div>
          <div>Health</div>
          <div>Diet Tags</div>
        </div>

        {filtered.map(r => (
          <div key={r.id} className="row">
            <div className="title">
              <div className="title-line">
                {r.image && <img src={r.image} alt="" className="thumb" loading="lazy" />}
                <span>{r.title}</span>
              </div>
              <div className="muted">
                {(r.cuisines?.length ? r.cuisines.join(', ') : '—')}
              </div>
            </div>
            <div>{Number.isFinite(+r.readyInMinutes) ? r.readyInMinutes : '—'}</div>
            <div>{Number.isFinite(+r.servings) ? r.servings : '—'}</div>
            <div>{Number.isFinite(+r.healthScore) ? r.healthScore : '—'}</div>
            <div className="tags">
              {r.vegetarian && <span className="tag">Vegetarian</span>}
              {r.vegan && <span className="tag">Vegan</span>}
              {r.glutenFree && <span className="tag">Gluten Free</span>}
              {!r.vegetarian && !r.vegan && !r.glutenFree && <span className="muted">—</span>}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="empty">No matches. Try clearing search or changing the diet filter.</p>
        )}
      </section>
    </div>
  );
}

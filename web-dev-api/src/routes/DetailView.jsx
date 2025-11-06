import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";

const API_BASE = "https://api.spoonacular.com";
const API_KEY = import.meta.env.VITE_APP_API_KEY;

function stripHtml(html) {
  const el = document.createElement("div");
  el.innerHTML = html || "";
  return el.textContent || el.innerText || "";
}

export default function RecipeDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        if (!API_KEY) throw new Error("Missing API key (VITE_APP_API_KEY)");
        // Get details with fields that weren't on the dashboard
        const url = `${API_BASE}/recipes/${id}/information?apiKey=${API_KEY}&includeNutrition=true`;
        const res = await fetch(url, { signal: ac.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (e) {
        if (e.name !== "AbortError") setErr(e.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [id]);

  const nutrition = data?.nutrition;
  const ingredients = data?.extendedIngredients || [];
  const steps = useMemo(() => {
    const ai = Array.isArray(data?.analyzedInstructions) ? data.analyzedInstructions : [];
    return ai.flatMap(b => b.steps || []).map(s => s.step).filter(Boolean);
  }, [data]);

  if (loading) return <div className="container"><p>Loading…</p></div>;
  if (err) return <div className="container"><p role="alert">Error: {err}</p></div>;
  if (!data) return null;

  return (
    <div className="container">
      <header className="header">
        <h1>{data.title}</h1>
        <p className="sub">
          Ready in {data.readyInMinutes ?? "—"} min · Servings {data.servings ?? "—"} · Health {data.healthScore ?? "—"}
        </p>
      </header>

      <section className="controls" style={{ marginTop: 0 }}>
        <Link to="/" className="tag" style={{ textDecoration: "none" }}>← Back to Dashboard</Link>
        {data.sourceUrl && (
          <a className="tag" href={data.sourceUrl} target="_blank" rel="noreferrer">Source</a>
        )}
      </section>

      <section className="list" style={{ padding: 16 }}>
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1.6fr 1.4fr" }}>
          <div>
            {data.image && (
              <img src={data.image} alt="" style={{ width: "100%", borderRadius: 10, border: "1px solid #1f2430" }} />
            )}
            <h3 style={{ marginTop: 16 }}>Summary</h3>
            <p style={{ whiteSpace: "pre-wrap" }}>{stripHtml(data.summary) || "—"}</p>

            <h3>Instructions</h3>
            {steps.length ? (
              <ol style={{ paddingLeft: 18 }}>
                {steps.map((t, i) => <li key={i} style={{ marginBottom: 6 }}>{t}</li>)}
              </ol>
            ) : <p className="muted">—</p>}
          </div>

          <div>
            <h3>Ingredients</h3>
            {ingredients.length ? (
              <ul style={{ paddingLeft: 18 }}>
                {ingredients.map((ing) => (
                  <li key={ing.id || ing.name}>
                    {ing.original || `${ing.amount ?? ""} ${ing.unit ?? ""} ${ing.name ?? ""}`}
                  </li>
                ))}
              </ul>
            ) : <p className="muted">—</p>}

            {nutrition?.nutrients?.length ? (
              <>
                <h3 style={{ marginTop: 16 }}>Nutrition (selected)</h3>
                <ul style={{ paddingLeft: 18 }}>
                  {nutrition.nutrients
                    .filter(n => ["Calories", "Protein", "Fat", "Carbohydrates", "Fiber", "Sugar"].includes(n.name))
                    .map(n => (
                      <li key={n.name}>{n.name}: {Math.round(n.amount)} {n.unit}</li>
                    ))}
                </ul>
              </>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

const API_BASE = "https://api.spoonacular.com";
const API_KEY = import.meta.env.VITE_APP_API_KEY;

// --- small helper
function stripHtml(html) {
  const el = document.createElement("div");
  el.innerHTML = html || "";
  return el.textContent || el.innerText || "";
}

// --- inline NutritionCharts component (lives in the same file)
function NutritionCharts({ nutrition }) {
  const nutrients = Array.isArray(nutrition?.nutrients) ? nutrition.nutrients : [];
  const find = (name, fallbackUnit) => {
    const n = nutrients.find(x => x?.name === name);
    return { amount: n ? Number(n.amount) : 0, unit: n?.unit || fallbackUnit };
  };

  // macros in grams
  const protein = find("Protein", "g").amount;
  const fat = find("Fat", "g").amount;
  const carbs = find("Carbohydrates", "g").amount;

  // Convert macros to kcal for donut
  const donutData = [
    { name: "Protein", value: protein * 4 },
    { name: "Fat", value: fat * 9 },
    { name: "Carbs", value: carbs * 4 },
  ];
  const COLORS = ["#7aa2f7", "#f7768e", "#9ece6a"];

  const BAR_KEYS = ["Calories", "Protein", "Fat", "Carbohydrates", "Fiber", "Sugar"];
  const barData = BAR_KEYS.map(k => {
    const { amount, unit } = find(k, k === "Calories" ? "kcal" : "g");
    return { name: k, amount, unit };
  });

  return (
    <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
      <div className="list" style={{ padding: 16, height: 320 }}>
        <h4 style={{ margin: "0 0 8px" }}>Macro Calories Split</h4>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
              {donutData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v, n) => [`${Math.round(v)} kcal`, n]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="list" style={{ padding: 16, height: 320 }}>
        <h4 style={{ margin: "0 0 8px" }}>Key Nutrients</h4>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={barData} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(v, n, p) => [`${v} ${p.payload.unit}`, n]} />
            <Legend />
            <Bar dataKey="amount" name="Amount" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
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

        // includeNutrition=true is key to get nutrition for charts
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

            {nutrition && (
              <>
                <h3 style={{ marginTop: 16 }}>Nutrition Charts</h3>
                <NutritionCharts nutrition={nutrition} />
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

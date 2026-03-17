import { useMemo } from "react";

export function useImcInfo(peso, talla) {
  return useMemo(() => {
    const p = parseFloat(peso);
    const t = parseFloat(talla);
    if (!p || !t || t <= 0) return { valor: '0.0', categoria: '---', color: 'text-slate-400' };

    const imc = (p / (t * t)).toFixed(1);
    let cat = "";
    let color = "";

    if (imc < 18.5) { cat = "Bajo Peso"; color = "text-blue-400"; }
    else if (imc < 25) { cat = "Normal"; color = "text-emerald-400"; }
    else if (imc < 30) { cat = "Sobrepeso"; color = "text-yellow-400"; }
    else if (imc < 35) { cat = "Obesidad I"; color = "text-orange-400"; }
    else if (imc < 40) { cat = "Obesidad II"; color = "text-red-400"; }
    else { cat = "Obesidad III"; color = "text-red-600"; }

    return { valor: imc, categoria: cat, color };
  }, [peso, talla]);
}

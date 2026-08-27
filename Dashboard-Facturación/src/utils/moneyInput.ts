// Handlers reutilizables para inputs monetarios.
//
// Uso:
//   <input {...moneyInputHandlers(state, setState)} style={{ ... }} />
//
// Comportamiento:
//   - Al mostrar (defaultValue) y al perder foco: formato "$ 1.234"
//   - Al recibir foco: convierte al número crudo "1234" y lo selecciona
//     (permite editar con teclado sin conflictos con puntos de miles)
//   - onKeyDown: solo permite dígitos, punto decimal, coma, teclas de edición
//
// Se usa el `key` en el input padre (ej: key={`v-${state}`}) si necesitas
// forzar re-mount cuando el valor cambia externamente. Sin `key` el input
// solo se refresca al foco/blur — como es uncontrolled con defaultValue.
export const fmtMon = (v: number): string =>
  '$ ' + Math.round(v || 0).toLocaleString('es-CO');

// Handler onKeyDown compartido — solo dígitos + puntos + comas + navegación.
export const soloNumericoKey = (e: React.KeyboardEvent<HTMLInputElement>): void => {
  const allowed = ['0','1','2','3','4','5','6','7','8','9','.',',','Backspace','Delete','Tab','Enter','ArrowLeft','ArrowRight','Home','End'];
  if (!allowed.includes(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault();
};

export const moneyInputHandlers = (
  value: number,
  onChange: (v: number) => void,
  fallback?: number
) => ({
  defaultValue: fmtMon(value),
  onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.value = value ? String(value) : '';
    e.target.select();
  },
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value.replace(/[^0-9.]/g, ''));
    if (!isNaN(v) && v >= 0) {
      onChange(v);
      e.target.value = fmtMon(v);
    } else if (fallback !== undefined) {
      onChange(fallback);
      e.target.value = fmtMon(fallback);
    } else {
      onChange(0);
      e.target.value = fmtMon(0);
    }
  },
  onKeyDown: soloNumericoKey,
});

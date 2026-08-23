import type { CustomCssRule, CustomCssTarget } from 'src/types/webForms';

interface CssTargetOption {
  value: CustomCssTarget;
  label: string;
  // Ausente solo en "advanced" -- ahí el CSS se inyecta tal cual, sin envolver en ningún selector
  // (para quien ya sabe CSS y necesita algo que las clases fijas no cubren, ej. :hover).
  className?: string;
  hint: string;
}

// Mismo criterio que CustomCssTarget en el backend (web_form_schema.py) -- cada opción (salvo
// "advanced") tiene una clase real puesta en el DOM de la página pública (PublicWebFormPage.tsx),
// para que el usuario no tenga que escribir el selector CSS él mismo, solo las declaraciones.
export const CUSTOM_CSS_TARGET_OPTIONS: CssTargetOption[] = [
  // "container" y "text" apuntan a la misma clase (el contenedor raíz del formulario público) --
  // se muestran como dos opciones separadas para que sea más intuitivo elegir si querés tocar el
  // fondo o el texto general, en vez de tener que pensar "son lo mismo".
  { value: 'container', label: 'Fondo del formulario', className: 'web-form-container', hint: 'Ej: background: linear-gradient(180deg, #fff, #eee); background-size: cover; padding: 40px;' },
  { value: 'text', label: 'Texto general del formulario', className: 'web-form-container', hint: 'Ej: color: #333; font-size: 16px; letter-spacing: 0.5px; (afecta título, descripción y mensajes -- los campos y el botón tienen su propio estilo más abajo)' },
  { value: 'image', label: 'Imagen', className: 'web-form-image', hint: 'Ej: max-width: 120px; border-radius: 50%;' },
  { value: 'title', label: 'Título', className: 'web-form-title', hint: 'Ej: font-size: 32px; color: #ff0000;' },
  { value: 'description', label: 'Descripción / subtítulo', className: 'web-form-description', hint: 'Ej: font-style: italic; opacity: 0.7;' },
  { value: 'field', label: 'Campos del formulario', className: 'web-form-field', hint: 'Ej: margin-bottom: 24px;' },
  { value: 'submit_button', label: 'Botón "Enviar"', className: 'web-form-submit-button', hint: 'Ej: background: #000; text-transform: uppercase;' },
  { value: 'required_legend', label: 'Texto "campos obligatorios"', className: 'web-form-required-legend', hint: 'Ej: font-size: 12px; color: #999;' },
  { value: 'success_message', label: 'Mensaje de éxito', className: 'web-form-success-message', hint: 'Ej: font-size: 20px; font-weight: bold;' },
  { value: 'advanced', label: 'Avanzado (CSS libre, sin clase)', hint: 'Escribí vos el/los selectores, ej: .web-form-title:hover { color: red; }' },
];

export const getCssTargetOption = (target: CustomCssTarget) =>
  CUSTOM_CSS_TARGET_OPTIONS.find(o => o.value === target);

/**
 * Arma el bloque final de <style> a partir de las reglas guardadas. Para todos los targets salvo
 * "advanced", envuelve las declaraciones que escribió el usuario en `.clase { ... }` -- así no
 * necesita saber el nombre de la clase real ni escribir el selector. Solo se usa en la página
 * pública real (PublicWebFormPage.tsx), nunca en la vista previa del editor.
 */
export const compileCustomCss = (rules?: CustomCssRule[] | null): string => {
  if (!rules?.length) return '';
  return rules
    .filter(r => r.css?.trim())
    .map(r => {
      const opt = getCssTargetOption(r.target);
      if (!opt?.className) return r.css;
      return `.${opt.className} { ${r.css} }`;
    })
    .join('\n');
};

import { Checkbox, FormControlLabel, MenuItem, TextField } from '@mui/material';
import {
  DATE_SUBTYPE_INPUT, TEXT_SUBTYPE_INPUT, isBoolType, isDateType, isNumberType, isSelectorType,
} from './webFormFieldTypeUtils';

export interface WebFormFieldOptionLite {
  id: string;
  value: string;
}

interface WebFormFieldRendererProps {
  label: string;
  typeCode?: string | null;
  subtypeCode?: string | null;
  placeholder?: string | null;
  required?: boolean;
  options?: WebFormFieldOptionLite[];
  value: string | boolean;
  onChange: (value: string | boolean) => void;
  disabled?: boolean;
  borderRadius?: string;
}

/**
 * Widget de un campo del formulario según su tipo (texto/número/fecha/selector/checkbox) --
 * compartido entre la vista previa en vivo del editor (WebFormLivePreview, no interactiva) y la
 * página pública real (PublicWebFormPage, interactiva) para que ambas queden siempre sincronizadas.
 */
export const WebFormFieldRenderer = ({
  label, typeCode, subtypeCode, placeholder, required = false, options = [],
  value, onChange, disabled = false, borderRadius,
}: WebFormFieldRendererProps) => {
  const radiusSx = borderRadius ? { '& .MuiOutlinedInput-notchedOutline': { borderRadius } } : undefined;

  if (isBoolType(typeCode)) {
    return (
      <FormControlLabel
        control={<Checkbox checked={value === true} disabled={disabled} onChange={e => onChange(e.target.checked)} />}
        label={label}
      />
    );
  }

  // SELECTOR/CHECKBOX (Lista): selección simple, aunque el campo original sea de selección
  // múltiple -- el submit público solo admite un valor de texto por campo (ver
  // web_form_public_controller.py, `value=str(final_value)`); soporte multi-selección queda
  // pendiente para una iteración futura si hace falta.
  if (isSelectorType(typeCode)) {
    return (
      <TextField
        select
        fullWidth
        label={label}
        placeholder={placeholder ?? undefined}
        required={required}
        disabled={disabled}
        value={typeof value === 'string' ? value : ''}
        onChange={e => onChange(e.target.value)}
        sx={radiusSx}
      >
        <MenuItem value="">-- Seleccionar --</MenuItem>
        {options.map(opt => (
          <MenuItem key={opt.id} value={opt.id}>{opt.value}</MenuItem>
        ))}
      </TextField>
    );
  }

  return (
    <TextField
      fullWidth
      type={isNumberType(typeCode) ? 'number'
        : isDateType(typeCode) ? (DATE_SUBTYPE_INPUT[subtypeCode ?? ''] ?? 'date')
          : (TEXT_SUBTYPE_INPUT[subtypeCode ?? ''] ?? 'text')}
      label={label}
      placeholder={placeholder ?? undefined}
      required={required}
      disabled={disabled}
      value={typeof value === 'string' ? value : ''}
      slotProps={{ inputLabel: isDateType(typeCode) ? { shrink: true } : undefined }}
      onChange={e => onChange(e.target.value)}
      sx={radiusSx}
    />
  );
};

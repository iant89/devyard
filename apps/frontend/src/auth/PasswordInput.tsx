import { useState, type ComponentProps } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { IconButton, Input } from '@enterprise-ui/react';

/** DY-D1 gap G3: Input type=password + reveal IconButton (no dedicated framework component yet). */
export function PasswordInput(props: Omit<ComponentProps<typeof Input>, 'type' | 'endAdornment'>) {
  const [shown, setShown] = useState(false);
  return (
    <Input
      {...props}
      type={shown ? 'text' : 'password'}
      endAdornment={
        <IconButton
          icon={shown ? <EyeOff /> : <Eye />}
          label={shown ? 'Hide password' : 'Show password'}
          aria-pressed={shown}
          variant="tertiary"
          neutral
          size="sm"
          disabled={props.disabled}
          onClick={() => setShown((s) => !s)}
        />
      }
    />
  );
}

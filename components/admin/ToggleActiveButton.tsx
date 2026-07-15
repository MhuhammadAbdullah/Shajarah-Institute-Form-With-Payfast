interface ToggleActiveButtonProps {
  id: string;
  isActive: boolean;
  toggleAction: (formData: FormData) => void;
}

export function ToggleActiveButton({ id, isActive, toggleAction }: ToggleActiveButtonProps) {
  return (
    <form action={toggleAction}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
          isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
        }`}
      >
        {isActive ? "Active" : "Inactive"}
      </button>
    </form>
  );
}

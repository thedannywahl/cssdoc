// A JSX consumer. The same features work here as in HTML: hover a class for docs,
// F12 to jump to its definition, completions inside className="…", and unknown /
// deprecated modifiers get flagged. Class usage is also detected inside helpers like
// clsx(). Clean by default. Things to TRY:
//   - Hover "button--secondary" ................ shows its summary and docs
//   - Cursor on it, press F12 .................. jumps into components.css
//   - Type a space inside className="button |" . completion lists button's modifiers
//   - Change "button--secondary" to "button--x"  "unknown-modifier" warning
//   - Change it to "button--ghost" ............. "deprecated-modifier" + quick-fix
//   - In the clsx() call, change "card--featured" "unknown-modifier" (usage is
//     to "card--nope" ...........................  checked inside clsx() too)
import clsx from "clsx";

export function App({ featured }) {
  return (
    <main>
      <button className="button button--secondary">Save</button>

      <div className={clsx("card", featured && "card--featured")}>Featured content</div>
    </main>
  );
}

export function SignOutButton() {
  return (
    <form action="/auth/signout" method="post">
      <button className="min-h-12 w-full rounded-xl bg-charcoal px-5 py-4 font-bold text-bone">Log out</button>
    </form>
  );
}

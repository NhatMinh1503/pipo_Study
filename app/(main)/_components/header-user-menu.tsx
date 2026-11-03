import { UserMenu } from "@/components/layout/user-menu";
import { getSessionUser } from "@/server/auth";

import { signOut, updateDisplayLanguage } from "../_lib/actions";

export async function HeaderUserMenu() {
  const user = await getSessionUser();

  return (
    <UserMenu email={user?.email} onChangeLanguage={updateDisplayLanguage} onSignOut={signOut} />
  );
}

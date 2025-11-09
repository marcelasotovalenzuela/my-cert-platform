import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const handler = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Empresa",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        // TODO: reemplaza por validación real (Supabase/DB)
        if (creds?.email === "demo@demo.com" && creds?.password === "demo") {
          return { id: "1", email: "demo@demo.com", name: "Empresa Demo" };
        }
        return null;
      },
    }),
  ],
});

export { handler as GET, handler as POST };

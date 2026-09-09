import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { supabaseAdmin } from "@/lib/supabase/server";

const { TEST_USER_ID } = vi.hoisted(() => ({ TEST_USER_ID: "test-api-vocabulario-export" }));

vi.mock("@/lib/mcp/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/mcp/shared")>();
  return { ...actual, getLocalUserId: () => TEST_USER_ID };
});

const { GET } = await import("@/app/api/vocabulario/export/route");

const db = supabaseAdmin();

describe("GET /api/vocabulario/export (integracao real contra Supabase)", () => {
  let skillItemId: string;

  beforeAll(async () => {
    await db.from("profiles").delete().eq("user_id", TEST_USER_ID);
    await db.from("profiles").insert({ user_id: TEST_USER_ID });

    const { data: item } = await db.from("skill_items").select("id").limit(1).single();
    skillItemId = item!.id;

    await db.from("user_item_status").upsert({
      user_id: TEST_USER_ID,
      skill_item_id: skillItemId,
      status: "conhecido",
    });
  });

  afterAll(async () => {
    await db.from("user_item_status").delete().eq("user_id", TEST_USER_ID);
    await db.from("profiles").delete().eq("user_id", TEST_USER_ID);
  });

  it("retorna o csv dos itens dominados com content-type text/csv", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");

    const csv = await res.text();
    expect(csv).toContain("Texto,Domínio,Nível,Definição");
  });

  it("inclui o cabecalho de download com o nome do arquivo", async () => {
    const res = await GET();
    expect(res.headers.get("content-disposition")).toContain("meu-vocabulario.csv");
  });
});

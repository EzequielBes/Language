import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { supabaseAdmin } from "@/lib/supabase/server";

const { TEST_USER_ID } = vi.hoisted(() => ({ TEST_USER_ID: "test-api-flashcards" }));

vi.mock("@/lib/mcp/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/mcp/shared")>();
  return { ...actual, getLocalUserId: () => TEST_USER_ID };
});

const { POST } = await import("@/app/api/flashcards/review/route");

const db = supabaseAdmin();

function req(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/flashcards/review", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("POST /api/flashcards/review (integracao real contra Supabase)", () => {
  let skillItemId: string;

  beforeAll(async () => {
    await db.from("profiles").delete().eq("user_id", TEST_USER_ID);
    await db.from("profiles").insert({ user_id: TEST_USER_ID });

    const { data: item } = await db.from("skill_items").select("id").limit(1).single();
    skillItemId = item!.id;
  });

  afterAll(async () => {
    await db.from("profiles").delete().eq("user_id", TEST_USER_ID);
  });

  it("dado o primeiro flashcard revisado por este usuario, entao a resposta inclui o selo primeiro_flashcard", async () => {
    const res = await POST(req({ skill_item_id: skillItemId, resultado: "conhecido" }));
    const body = await res.json();
    expect(body.newlyUnlocked.some((a: { chave: string }) => a.chave === "primeiro_flashcard")).toBe(true);
  });

  it("registra a resposta e retorna o novo status do item", async () => {
    const res = await POST(req({ skill_item_id: skillItemId, resultado: "conhecido" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.itemStatus).toBe("conhecido");
  });

  it("rejeita payload invalido com 400", async () => {
    const res = await POST(req({ skill_item_id: "nao-e-uuid", resultado: "conhecido" }));
    expect(res.status).toBe(400);
  });

  it("retorna 404 pra um skill_item_id inexistente", async () => {
    const res = await POST(
      req({ skill_item_id: "00000000-0000-0000-0000-000000000000", resultado: "conhecido" }),
    );
    expect(res.status).toBe(404);
  });

  it("rejeita origem cruzada com 403", async () => {
    const res = await POST(
      req(
        { skill_item_id: skillItemId, resultado: "conhecido" },
        { origin: "http://evil.example" },
      ),
    );
    expect(res.status).toBe(403);
  });
});

import { describe, expect, it } from "vitest";
import { createStealthIdentity } from "./stealth";
import { decryptIdentityBackup, encryptIdentityBackup, KeyBackupError } from "./key-backup";

describe("encrypted stealth identity backup", () => {
  it("round trips an identity using authenticated encryption", async () => {
    const identity = createStealthIdentity();
    const backup = await encryptIdentityBackup(identity, "correct horse battery staple");
    const restored = await decryptIdentityBackup(backup, "correct horse battery staple");

    expect(restored).toEqual(identity);
    expect(backup).not.toContain(identity.spendingPrivateKey);
    expect(backup).not.toContain(identity.viewingPrivateKey);
  });

  it("rejects a wrong passphrase and modified ciphertext", async () => {
    const backup = await encryptIdentityBackup(createStealthIdentity(), "correct horse battery staple");
    await expect(decryptIdentityBackup(backup, "incorrect passphrase")).rejects.toBeInstanceOf(KeyBackupError);

    const parsed = JSON.parse(backup) as { ciphertext: string };
    const changed = { ...JSON.parse(backup), ciphertext: `${parsed.ciphertext.slice(0, -4)}AAAA` };
    await expect(decryptIdentityBackup(JSON.stringify(changed), "correct horse battery staple"))
      .rejects.toBeInstanceOf(KeyBackupError);
  });

  it("rejects short passphrases and unsupported or malformed backup formats", async () => {
    const identity = createStealthIdentity();
    await expect(encryptIdentityBackup(identity, "short")).rejects.toThrow("12 and 1024 characters");
    await expect(decryptIdentityBackup("not json", "correct horse battery staple")).rejects.toThrow("valid JSON");
    await expect(decryptIdentityBackup("{}", "correct horse battery staple")).rejects.toThrow("unsupported or malformed");
  });
});

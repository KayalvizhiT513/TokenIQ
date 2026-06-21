import { describe, it, expect, beforeEach } from 'vitest'
import { encrypt, decrypt } from '@/lib/crypto'

describe('crypto', () => {
  it('should encrypt and decrypt a string', () => {
    const plaintext = 'ghp_test_token_12345'
    const encrypted = encrypt(plaintext)
    const decrypted = decrypt(encrypted)

    expect(encrypted).not.toBe(plaintext)
    expect(decrypted).toBe(plaintext)
  })

  it('should produce different ciphertexts for the same plaintext', () => {
    const plaintext = 'test_data'
    const encrypted1 = encrypt(plaintext)
    const encrypted2 = encrypt(plaintext)

    expect(encrypted1).not.toBe(encrypted2)
  })

  it('should throw on invalid ciphertext format', () => {
    expect(() => decrypt('invalid')).toThrow()
  })

  it('should throw on corrupted ciphertext', () => {
    const plaintext = 'test'
    const encrypted = encrypt(plaintext)
    const corrupted = encrypted.substring(0, encrypted.length - 5) + 'xxxxx'

    expect(() => decrypt(corrupted)).toThrow()
  })
})

import { describe, it, expect } from 'vitest'
import { isAllowedProxyImageUrl } from '../proxy-image-allowlist'

describe('proxy-image allowlist', () => {
    it('permite hosts legítimos de Instagram/Facebook CDN', () => {
        expect(isAllowedProxyImageUrl('https://scontent-mad1-1.cdninstagram.com/v/foo.jpg')).toBe(true)
        expect(isAllowedProxyImageUrl('https://scontent.cdninstagram.com/img.jpg')).toBe(true)
        expect(isAllowedProxyImageUrl('https://scontent-mad2-1.xx.fbcdn.net/v/img.jpg')).toBe(true)
        expect(isAllowedProxyImageUrl('https://www.instagram.com/p/foo/media')).toBe(true)
        expect(isAllowedProxyImageUrl('https://instagram.com/p/foo/media')).toBe(true)
    })

    it('rechaza bypass por sufijo falso (instagram.com.evil.com)', () => {
        expect(isAllowedProxyImageUrl('https://instagram.com.evil.com/x.jpg')).toBe(false)
        expect(isAllowedProxyImageUrl('https://cdninstagram.com.attacker.net/x.jpg')).toBe(false)
        expect(isAllowedProxyImageUrl('https://evilinstagram.com/x.jpg')).toBe(false)
        expect(isAllowedProxyImageUrl('https://fakecdninstagram.com/x.jpg')).toBe(false)
    })

    it('rechaza esquemas no https y URLs inválidas', () => {
        expect(isAllowedProxyImageUrl('http://scontent.cdninstagram.com/x.jpg')).toBe(false)
        expect(isAllowedProxyImageUrl('ftp://instagram.com/x.jpg')).toBe(false)
        expect(isAllowedProxyImageUrl('no-es-una-url')).toBe(false)
        expect(isAllowedProxyImageUrl('https://localhost/x.jpg')).toBe(false)
        expect(isAllowedProxyImageUrl('https://169.254.169.254/latest/meta-data')).toBe(false)
    })
})

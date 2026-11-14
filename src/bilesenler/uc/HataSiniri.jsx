// 3B'nin ortak hata yolu: WebGL denetimi ve sahne içi hataları yakalayan sınır.
// Hata üst bileşene (GokyuzuKutusu) bildirilir; kutu panoramaya döner.

import { Component } from 'react'

export function webglVar() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

/** Sahne içindeki bir hatayı yakalar ve onHata ile üst bileşene bildirir. */
export class HataSiniri extends Component {
  state = { hata: null }
  static getDerivedStateFromError(hata) {
    return { hata }
  }
  componentDidCatch(hata) {
    this.props.onHata?.(hata)
  }
  render() {
    return this.state.hata ? null : this.props.children
  }
}

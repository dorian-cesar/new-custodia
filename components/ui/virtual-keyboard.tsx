'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Delete, ArrowDownToLine, Space, Globe } from 'lucide-react'

// Cambia esta variable a true para activar el teclado digital, o a false para desactivarlo
const ENABLE_VIRTUAL_KEYBOARD = true;

export function VirtualKeyboard() {
  const [activeInput, setActiveInput] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const [layout, setLayout] = useState<'qwerty' | 'numeric'>('qwerty')
  const [isShift, setIsShift] = useState(false)
  const [isSymbols, setIsSymbols] = useState(false)
  const keyboardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ENABLE_VIRTUAL_KEYBOARD) return;

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') &&
        !target.readOnly &&
        target.type !== 'button' &&
        target.type !== 'submit' &&
        target.type !== 'checkbox' &&
        target.type !== 'radio' &&
        target.type !== 'file'
      ) {
        setActiveInput(target)
        
        // Auto-detect layout
        const inputMode = target.getAttribute('inputmode')
        const type = target.type
        if (
          inputMode === 'numeric' || 
          inputMode === 'decimal' || 
          type === 'number' || 
          target.placeholder.toLowerCase().includes('monto') ||
          target.placeholder.toLowerCase().includes('efectivo') ||
          target.placeholder.toLowerCase().includes('valor')
        ) {
          setLayout('numeric')
        } else {
          setLayout('qwerty')
        }
      }
    }

    const handleBlur = (e: FocusEvent) => {
      // Small timeout to allow clicking keyboard keys without closing
      setTimeout(() => {
        if (document.activeElement && 
           (document.activeElement.tagName === 'INPUT' || 
            document.activeElement.tagName === 'TEXTAREA' ||
            keyboardRef.current?.contains(document.activeElement as Node))) {
          return
        }
        // If the focus moved outside input and not inside the keyboard, close
        setActiveInput(null)
      }, 150)
    }

    document.addEventListener('focusin', handleFocus)
    document.addEventListener('focusout', handleBlur)

    return () => {
      document.removeEventListener('focusin', handleFocus)
      document.removeEventListener('focusout', handleBlur)
    }
  }, [])

  if (!ENABLE_VIRTUAL_KEYBOARD || !activeInput) return null

  const handleKeyPress = (key: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!activeInput) return

    const start = activeInput.selectionStart ?? 0
    const end = activeInput.selectionEnd ?? 0
    const val = activeInput.value

    let newValue = val
    let newCursorPos = start

    if (key === 'BACKSPACE') {
      if (start === end) {
        if (start > 0) {
          newValue = val.substring(0, start - 1) + val.substring(end)
          newCursorPos = start - 1
        }
      } else {
        newValue = val.substring(0, start) + val.substring(end)
        newCursorPos = start
      }
    } else if (key === 'SPACE') {
      newValue = val.substring(0, start) + ' ' + val.substring(end)
      newCursorPos = start + 1
    } else if (key === 'SHIFT') {
      setIsShift(!isShift)
      return
    } else if (key === 'SYM') {
      setIsSymbols(!isSymbols)
      return
    } else if (key === 'ABC') {
      setIsSymbols(false)
      return
    } else if (key === 'DONE') {
      activeInput.blur()
      setActiveInput(null)
      return
    } else if (key === 'LAYOUT_TOGGLE') {
      setLayout(layout === 'qwerty' ? 'numeric' : 'qwerty')
      return
    } else {
      newValue = val.substring(0, start) + key + val.substring(end)
      newCursorPos = start + key.length
    }

    // Update value and cursor
    activeInput.value = newValue
    activeInput.setSelectionRange(newCursorPos, newCursorPos)

    // Dispatch native input event so React state updates
    const event = new Event('input', { bubbles: true })
    activeInput.dispatchEvent(event)

    // Keep focus
    activeInput.focus()
  }

  const qwertyRows = isSymbols
    ? [
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
        ['-', '/', ':', ';', '(', ')', '$', '&', '@', '"'],
        ['SYM', '.', ',', '?', '!', "'", '_', 'BACKSPACE'],
        ['LAYOUT_TOGGLE', 'ABC', 'SPACE', 'DONE']
      ]
    : [
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
        isShift 
          ? ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P']
          : ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
        isShift
          ? ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ']
          : ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ'],
        [
          'SHIFT',
          isShift ? 'Z' : 'z',
          isShift ? 'X' : 'x',
          isShift ? 'C' : 'c',
          isShift ? 'V' : 'v',
          isShift ? 'B' : 'b',
          isShift ? 'N' : 'n',
          isShift ? 'M' : 'm',
          'k',
          'K'
        ],
        ['LAYOUT_TOGGLE', 'SYM', '-', '.', 'SPACE', 'BACKSPACE', 'DONE']
      ]

  const numericKeys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['-', '0', 'k'],
    ['.', 'K', 'BACKSPACE'],
    ['LAYOUT_TOGGLE', 'DONE']
  ]

  return (
    <div
      ref={keyboardRef}
      className="fixed bottom-0 left-0 right-0 bg-[#242424]/95 backdrop-blur-md border-t-2 border-zinc-500 p-3 flex flex-col gap-2 z-50 animate-in slide-in-from-bottom duration-200 select-none shadow-2xl"
      onMouseDown={(e) => e.preventDefault()} // Prevents input blur on click
    >
      {/* Keyboard Header */}
      <div className="flex justify-between items-center px-2 py-0.5 border-b border-zinc-700/50 mb-1 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
        <span>Teclado Kiosco Activo</span>
        <button 
          onClick={(e) => handleKeyPress('DONE', e as any)} 
          className="text-[#00c5ff] hover:text-white flex items-center gap-1 cursor-pointer font-black"
        >
          <ArrowDownToLine className="h-3.5 w-3.5" />
          Ocultar
        </button>
      </div>

      {/* Keys Layout */}
      {layout === 'qwerty' ? (
        <div className="flex flex-col gap-1.5 max-w-[800px] mx-auto w-full">
          {qwertyRows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex justify-center gap-1.5 w-full">
              {row.map((key) => {
                let buttonClass = "flex-1 h-11 min-w-[28px] max-w-[64px] rounded-lg font-bold text-sm bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center border border-zinc-700 transition-all active:scale-95 cursor-pointer"
                let content: React.ReactNode = key

                if (key === 'SHIFT') {
                  buttonClass = `flex-1 h-11 max-w-[64px] rounded-lg font-black text-xs flex items-center justify-center border transition-all active:scale-95 cursor-pointer ${
                    isShift 
                      ? 'bg-[#00c5ff] border-[#00b4eb] text-white' 
                      : 'bg-zinc-700 hover:bg-zinc-600 text-white border-zinc-600'
                  }`
                  content = 'MAYÚS'
                } else if (key === 'BACKSPACE') {
                  buttonClass = "flex-1 h-11 max-w-[80px] rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white flex items-center justify-center border border-zinc-600 transition-all active:scale-95 cursor-pointer"
                  content = <Delete className="h-4.5 w-4.5" />
                } else if (key === 'SPACE') {
                  buttonClass = "flex-[3] h-11 min-w-[120px] max-w-[320px] rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center border border-zinc-700 transition-all active:scale-95 cursor-pointer"
                  content = <Space className="h-4.5 w-4.5" />
                } else if (key === 'DONE') {
                  buttonClass = "flex-1 h-11 max-w-[80px] rounded-lg bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 font-extrabold text-xs text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                  content = 'LISTO'
                } else if (key === 'LAYOUT_TOGGLE') {
                  buttonClass = "flex-1 h-11 max-w-[80px] rounded-lg bg-zinc-700 hover:bg-zinc-600 border border-zinc-600 font-extrabold text-xs text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                  content = '123'
                } else if (key === 'SYM' || key === 'ABC') {
                  buttonClass = "flex-1 h-11 max-w-[64px] rounded-lg bg-zinc-700 hover:bg-zinc-600 border border-zinc-600 font-extrabold text-xs text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                  content = key
                }

                return (
                  <button
                    key={key}
                    type="button"
                    className={buttonClass}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => handleKeyPress(key, e)}
                  >
                    {content}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 max-w-[280px] mx-auto w-full py-1">
          {numericKeys.map((row, rowIndex) => (
            <div key={rowIndex} className="flex justify-center gap-1.5 w-full">
              {row.map((key) => {
                let buttonClass = "flex-1 h-12 rounded-lg font-black text-base bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center border border-zinc-700 transition-all active:scale-95 cursor-pointer"
                let content: React.ReactNode = key

                if (key === 'BACKSPACE') {
                  buttonClass = "flex-1 h-12 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white flex items-center justify-center border border-zinc-600 transition-all active:scale-95 cursor-pointer"
                  content = <Delete className="h-5 w-5" />
                } else if (key === 'DONE') {
                  buttonClass = "flex-[1.5] h-12 rounded-lg bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 font-extrabold text-sm text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                  content = 'LISTO'
                } else if (key === 'LAYOUT_TOGGLE') {
                  buttonClass = "flex-[1.5] h-12 rounded-lg bg-zinc-700 hover:bg-zinc-600 border border-zinc-600 font-extrabold text-sm text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                  content = 'ABC'
                }

                return (
                  <button
                    key={key}
                    type="button"
                    className={buttonClass}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => handleKeyPress(key, e)}
                  >
                    {content}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

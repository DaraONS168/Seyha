import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import GoogleMapPicker from './GoogleMapPicker'

describe('GoogleMapPicker', () => {
  it('shows setup guidance when the API key is missing', () => {
    render(<GoogleMapPicker latitude="11.5564" longitude="104.9282" onChange={() => {}}/>)
    expect(screen.getByText('Google Map Picker មិនទាន់បានកំណត់')).toBeInTheDocument()
    expect(screen.getByTitle('Market location preview')).toBeInTheDocument()
  })
})

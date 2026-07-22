import { describe,expect,it } from 'vitest'
import { validateExpenseRequest } from './expenseService'

const validRequest={request_date:'2026-07-22',province_id:1,project_id:1,expense_category_id:1,purpose:'ចំណាយសម្រាប់បេសកកម្មខេត្ត',requested_amount:500}

describe('validateExpenseRequest',()=>{
  it('accepts a complete positive request',()=>{
    expect(validateExpenseRequest(validRequest)).toEqual({})
  })

  it('requires all budget dimensions',()=>{
    const errors=validateExpenseRequest({...validRequest,province_id:'',project_id:'',expense_category_id:''})
    expect(errors).toMatchObject({province_id:expect.any(String),project_id:expect.any(String),expense_category_id:expect.any(String)})
  })

  it('rejects zero and negative amounts',()=>{
    expect(validateExpenseRequest({...validRequest,requested_amount:0}).requested_amount).toBeTruthy()
    expect(validateExpenseRequest({...validRequest,requested_amount:-1}).requested_amount).toBeTruthy()
  })
})

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

export function getUserId(): string {
  let id = localStorage.getItem('careerpath_user_id')
  if (!id) {
    id = generateUUID()
    localStorage.setItem('careerpath_user_id', id)
  }
  return id
}

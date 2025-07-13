'use client'
import { startTransition } from 'react'
import { useNavigationEvent } from 'navigation-react'
import { useOptimistic } from 'react'

const Gender = () => {
  const { data, stateNavigator } = useNavigationEvent()
  const { gender } = data
  const [optimisticGender, setOptimisticGender] = useOptimistic(
    gender || '',
    (_, newGender) => newGender,
  )
  return (
    <div>
      <label htmlFor="gender">Gender</label>
      <select
        id="gender"
        value={optimisticGender}
        onChange={({ target: { value } }) => {
          startTransition(() => {
            setOptimisticGender(value)
            stateNavigator.refresh({ ...data, gender: value })
          })
        }}
      >
        <option value=""></option>
        <option value="male">Male</option>
        <option value="female">Female</option>
        <option value="other">Other</option>
      </select>
    </div>
  )
}

export default Gender

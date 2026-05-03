import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from './store'

// The useAppDispatch hook is used to dispatch actions to the store.
// The withTypes function is used to add type safety to the useDispatch and useSelector hooks.
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
// The useAppSelector hook is used to select the state from the store.
export const useAppSelector = useSelector.withTypes<RootState>()

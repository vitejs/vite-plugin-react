import { RefreshLink, useNavigationEvent } from 'navigation-react'

const Pager = ({ totalRowCount }: { totalRowCount: number }) => {
  const {
    data: { page, size },
  } = useNavigationEvent()
  const lastPage = Math.ceil(totalRowCount / size)
  return (
    <div>
      <ul>
        {totalRowCount ? (
          <>
            <li>
              <RefreshLink
                navigationData={{ page: 1 }}
                includeCurrentData
                disableActive
              >
                First
              </RefreshLink>
            </li>
            <li>
              <RefreshLink
                navigationData={{ page: Math.max(page - 1, 1) }}
                includeCurrentData
                disableActive
              >
                Previous
              </RefreshLink>
            </li>
            <li>
              <RefreshLink
                navigationData={{ page: Math.min(lastPage, page + 1) }}
                includeCurrentData
                disableActive
              >
                Next
              </RefreshLink>
            </li>
            <li>
              <RefreshLink
                navigationData={{ page: lastPage }}
                includeCurrentData
                disableActive
              >
                Last
              </RefreshLink>
            </li>
          </>
        ) : (
          <>
            <li>First</li>
            <li>Previous</li>
            <li>Next</li>
            <li>Last</li>
          </>
        )}
      </ul>
      Total Count {totalRowCount}
    </div>
  )
}

export default Pager

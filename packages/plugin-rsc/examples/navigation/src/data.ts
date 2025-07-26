type Person = {
  id: number
  name: string
  gender: 'male' | 'female' | 'other'
  dateOfBirth: string
  email: string
  phone: string
  friends: number[]
}

var people: Person[] = [
  {
    id: 1,
    name: 'Bell Halvorson',
    gender: 'female',
    dateOfBirth: '01/01/1980',
    email: 'bell@navigation.com',
    phone: '555 0001',
    friends: [2, 3, 4, 5],
  },
  {
    id: 2,
    name: 'Aditya Larson',
    gender: 'male',
    dateOfBirth: '01/02/1980',
    email: 'aditya@navigation.com',
    phone: '555 0002',
    friends: [3, 4, 5, 6],
  },
  {
    id: 3,
    name: 'Rashawn Schamberger',
    gender: 'male',
    dateOfBirth: '01/03/1980',
    email: 'rashawn@navigation.com',
    phone: '555 0003',
    friends: [4, 5, 6, 7],
  },
  {
    id: 4,
    name: 'Rupert Grant',
    gender: 'male',
    dateOfBirth: '01/04/1980',
    email: 'rupert@navigation.com',
    phone: '555 0004',
    friends: [5, 6, 7, 8],
  },
  {
    id: 5,
    name: 'Opal Carter',
    gender: 'female',
    dateOfBirth: '01/05/1980',
    email: 'opal@navigation.com',
    phone: '555 0005',
    friends: [6, 7, 8, 9],
  },
  {
    id: 6,
    name: 'Candida Christiansen',
    gender: 'female',
    dateOfBirth: '01/06/1980',
    email: 'candida@navigation.com',
    phone: '555 0006',
    friends: [7, 8, 9, 10],
  },
  {
    id: 7,
    name: 'Haven Stroman',
    gender: 'other',
    dateOfBirth: '01/07/1980',
    email: 'haven@navigation.com',
    phone: '555 0007',
    friends: [8, 9, 10, 11],
  },
  {
    id: 8,
    name: 'Celine Leannon',
    gender: 'female',
    dateOfBirth: '01/08/1980',
    email: 'celine@navigation.com',
    phone: '555 0008',
    friends: [9, 10, 11, 12],
  },
  {
    id: 9,
    name: 'Ryan Ruecker',
    gender: 'male',
    dateOfBirth: '01/09/1980',
    email: 'ryan@navigation.com',
    phone: '555 0009',
    friends: [10, 11, 12, 1],
  },
  {
    id: 10,
    name: 'Kaci Hoppe',
    gender: 'other',
    dateOfBirth: '01/10/1980',
    email: 'kaci@navigation.com',
    phone: '555 0010',
    friends: [11, 12, 1, 2],
  },
  {
    id: 11,
    name: 'Fernando Dietrich',
    gender: 'male',
    dateOfBirth: '01/11/1980',
    email: 'fernando@navigation.com',
    phone: '555 0011',
    friends: [12, 1, 2, 3],
  },
  {
    id: 12,
    name: 'Emelie Lueilwitz',
    gender: 'female',
    dateOfBirth: '01/12/1980',
    email: 'emelie@navigation.com',
    phone: '555 0012',
    friends: [1, 2, 3, 4],
  },
]

const searchPeople = async (
  name: string,
  pageNumber: number,
  pageSize: number,
  sortExpression: string,
) => {
  return new Promise(
    (res: (data: { people: Person[]; count: number }) => void) => {
      var start = (pageNumber - 1) * pageSize
      var filteredPeople = people
        .sort((personA, personB) => {
          var mult = sortExpression.indexOf('desc') === -1 ? -1 : 1
          return mult * (personA.name < personB.name ? 1 : -1)
        })
        .filter(
          (person) =>
            !name ||
            person.name.toUpperCase().indexOf(name.toUpperCase()) !== -1,
        )
      setTimeout(() => {
        res({
          people: filteredPeople.slice(start, start + pageSize),
          count: filteredPeople.length,
        })
      }, 10)
    },
  )
}

const getPerson = async (id: number) => {
  return new Promise((res: (person: Person) => void) => {
    const person = people.find(({ id: personId }) => personId === id)!
    setTimeout(() => {
      res(person)
    }, 10)
  })
}

const getFriends = async (id: number, gender: 'male' | 'female' | 'other') => {
  return new Promise((res: (friends: Person[]) => void) => {
    const person = people.find(({ id: personId }) => personId == id)!
    setTimeout(() => {
      res(
        person.friends
          .map((id) => people.find(({ id: personId }) => personId === id)!)
          .filter(
            ({ gender: personGender }) => !gender || personGender === gender,
          ),
      )
    }, 10)
  })
}

export { searchPeople, getPerson, getFriends }

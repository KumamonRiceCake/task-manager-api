const request = require('supertest')
const app = require('../src/app')
const Task = require('../src/models/task')
const {
    userOneId,
    userOne,
    userTwo,
    taskOne,
    taskTwo,
    taskThree,
    setupDatabase
} = require('./fixtures/db')

beforeEach(setupDatabase)

test('Should create task for user', async () => {
    const response = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send({
            description: 'From my test'
        })
        .expect(201)

    const task = await Task.findById(response.body._id)
    expect(task).not.toBeNull()
    expect(task.completed).toEqual(false)
})

test('Should not create task with invalid description/completed', async () => {
    const response = await request(app)
    .post('/tasks')
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .send({
        description: 123,
        completed: 'invalid completed'
    })
    .expect(400)
})

test('Should fetch user tasks', async () => {
    const response = await request(app)
        .get('/tasks')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(200)

    expect(response.body.length).toEqual(2)
})

test('Should fetch user task by id', async () => {
    const response = await request(app)
        .get(`/tasks/${taskOne._id}`)
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(200)

    const task = await Task.findById(taskOne._id)
    expect(response.body).toMatchObject({
        description: task.description,
        completed: task.completed
    })
})

test('Should not fetch user task by id if unauthenticated', async () => {
    const response = await request(app)
    .get(`/tasks/${taskOne._id}`)
    .send()
    .expect(401)
})

test('Should not fetch other users task by id', async () => {
    const response = await request(app)
        .get(`/tasks/${taskThree._id}`)
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(404)
})

test('Should fetch only completed tasks', async () => {
    //tasks?completed=true
    const response = await request(app)
        .get('/tasks?completed=true')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(200)

    const task = await Task.findOne({ completed: true, owner: userOneId })
    expect(response.body.length).toEqual(1)
    expect(response.body[0]).toMatchObject({
        description: task.description,
        completed: task.completed
    })
})

test('Should fetch only incomplete tasks', async () => {
    //tasks?completed=false
    const response = await request(app)
        .get('/tasks?completed=false')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(200)

    const task = await Task.findOne({ completed: false, owner: userOneId })
    expect(response.body.length).toEqual(1)
    expect(response.body[0]).toMatchObject({
        description: task.description,
        completed: task.completed
    })
})

test('Should sort tasks by description', async () => {
    const response = await request(app)
        .get('/tasks?sortBy=description:desc')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(200)

    expect(response.body.length).toEqual(2)
    expect(response.body[0]).toMatchObject({
        description: taskTwo.description,
        completed: taskTwo.completed
    })
})

test('Should sort tasks by completed', async () => {
    const response = await request(app)
        .get('/tasks?sortBy=completed:desc')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(200)

    expect(response.body.length).toEqual(2)
    expect(response.body[0]).toMatchObject({
        description: taskTwo.description,
        completed: taskTwo.completed
    })
})

test('Should sort tasks by createdAt', async () => {
    //tasks?sortBy=createdAt:desc
    const response = await request(app)
        .get('/tasks?sortBy=createdAt:desc')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(200)

    expect(response.body.length).toEqual(2)
    expect(response.body[0]).toMatchObject({
        description: taskTwo.description,
        completed: taskTwo.completed
    })
})

test('Should sort tasks by updatedAt', async () => {
    const response = await request(app)
        .get('/tasks?sortBy=updatedAt:desc')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(200)

    expect(response.body.length).toEqual(2)
    expect(response.body[0]).toMatchObject({
        description: taskTwo.description,
        completed: taskTwo.completed
    })
})

test('Should fetch page of tasks', async () => {
    //tasks?limit=10&skip=10
    const response = await request(app)
        .get('/tasks?limit=2&skip=1')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(200)

    expect(response.body.length).toEqual(1)
    expect(response.body[0]).toMatchObject({
        description: taskTwo.description,
        completed: taskTwo.completed
    })
})

test('Should delete user task', async () => {
    const response = await request(app)
        .delete(`/tasks/${taskOne._id}`)
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(200)

    const task = await Task.findById(taskOne._id)
    expect(task).toBeNull()
})

test('Should not delete unowned tasks', async () => {
    const response = await request(app)
        .delete(`/tasks/${taskOne._id}`)
        .set('Authorization', `Bearer ${userTwo.tokens[0].token}`)
        .send()
        .expect(404)

    const task = await Task.findById(taskOne._id)
    expect(task).not.toBeNull()
})

test('Should not delete task if unauthenticated', async () => {
    const response = await request(app)
        .delete(`/tasks/${taskOne._id}`)
        .send()
        .expect(401)

    const task = await Task.findById(taskOne._id)
    expect(task).not.toBeNull()
})

test('Should not update task with invalid description/completed', async () => {
    const response = await request(app)
        .patch(`/tasks/${taskOne._id}`)
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send({
            description: true,
            completed: '123'
        })
        .expect(400)
})

test('Should not update other users task', async () => {
    const response = await request(app)
    .patch(`/tasks/${taskOne._id}`)
    .set('Authorization', `Bearer ${userTwo.tokens[0].token}`)
    .send({
        description: 'other users task',
        completed: true
    })
    .expect(404)
})

test('Should upload image to a task', async () => {
    await request(app)
        .post(`/tasks/${taskOne._id}/image`)
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .attach('image', 'tests/fixtures/sample.jpg')  // This should be from the root of the project
        .expect(200)

    const task = await Task.findById(taskOne._id)
    expect(task.image).toEqual(expect.any(Buffer))
})
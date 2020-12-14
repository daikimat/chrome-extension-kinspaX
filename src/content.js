(() => {
  'use strict'
  const timer = (delay) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(delay)
      }, delay)
    })
  }

  const debounce = (callback, wait) => {
    let timeout
    return (...args) => {
      const context = this
      clearTimeout(timeout)
      timeout = setTimeout(() => callback.apply(context, args), wait)
    }
  }

  const throttle = (callback, interval) => {
    let lastTime = Date.now() - interval
    return (...args) => {
      const context = this
      if ((lastTime + interval) < Date.now()) {
        lastTime = Date.now()
        callback.apply(context, args)
      }
    }
  }

  const storageKeys = {
    thredListWidth: 'thredListWidth',
    rightPaneWidth: 'rightPaneWidth',
    twopane: 'twopane'
  }

  class ThredListAndBody {
    constructor () {
      this.changeWidthEventListners = []
      this.getElements()
      if (this.contentLeftPane !== null && this.contentRightPane !== null && this.contentBody !== null) {
        this.ready = true
        this.addEventListener()
        this.windowScrollEvent = throttle(() => {
          (async () => {
            await timer(50)
            this.clickReadMoreIfDisplayed()
          })()
        }, 50)
        window.addEventListener('scroll', this.windowScrollEvent)
        const that = this
        chrome.storage.local.get([storageKeys.thredListWidth, storageKeys.rightPaneWidth], (result) => {
          if (result.thredListWidth !== undefined) {
            that.changeLeftPaneWidth(result.thredListWidth)
          }
          if (result.rightPaneWidth !== undefined) {
            that.changeRightPaneWidth(result.rightPaneWidth)
          }
        })
        return
      }
      this.ready = false
    }

    clickReadMoreIfDisplayed () {
      const isDisplayReadMore = (this.readMore.offsetParent !== null && this.readMore.style.display !== 'none')
      const isDisplayScrollPosition = (this.readMore.getBoundingClientRect().top - window.innerHeight) < 0
      if (isDisplayReadMore && isDisplayScrollPosition && this.readMoreLoading !== true) {
        this.readMore.click()
      }
    }

    getElements () {
      this.contentLeftPane = document.querySelector('.gaia-argoui-space-spacecontent.three-pane .gaia-argoui-space-spacecontent-left')
      this.contentRightPane = document.querySelector('.gaia-argoui-space-spacecontent.three-pane .gaia-argoui-space-spacecontent-right')
      this.threadListItemLink = document.querySelectorAll('.gaia-argoui-space-spacecontent.three-pane .gaia-argoui-space-threadlist-item-link')
      this.threadList = []
      this.threadListItemLink.forEach(element => {
        this.threadList.push({
          title: element.title,
          item: element.parentElement,
          link: element
        })
      })
      this.contentBody = document.querySelector('.gaia-argoui-space-spacecontent.three-pane .gaia-argoui-space-spacecontent-body')
      const readMores = document.querySelectorAll('.gaia-argoui-space-spacecontent.three-pane .gaia-argoui-space-threadlist-readmore')
      this.readMore = readMores[readMores.length - 1]
    }

    addEventListener () {
      this.readMore.addEventListener('click', () => {
        if (this.readMoreLoading) {
          return
        }
        this.readMoreLoading = true;
        (async () => {
          await timer(250)
          this.getElements()
          this.addEventListener()
          this.changeLeftPaneWidth(this.contentBody.offsetLeft)
          this.readMoreLoading = false
          this.filter(this.filterdKeyword)
        })()
      })
    }

    changeLeftPaneWidth (width) {
      // super heavy
      if (this.ready === false) {
        return
      }
      let widthWithPx = null
      if (width !== null) {
        widthWithPx = width + 'px'
      }
      this.contentLeftPane.style.width = widthWithPx
      this.threadListItemLink.forEach(element => {
        element.style.width = widthWithPx
      })
      this.contentBody.style.marginLeft = widthWithPx
      chrome.storage.local.set({ thredListWidth: width })
      this.changeWidthEventListners.forEach(listener => {
        listener(width)
      })
    }

    changeRightPaneWidth (width) {
      // super heavy
      if (this.ready === false) {
        return
      }
      let widthWithPx = null
      if (width !== null) {
        widthWithPx = width + 'px'
      }
      this.contentRightPane.style.width = widthWithPx
      this.contentBody.style.marginRight = widthWithPx
      chrome.storage.local.set({ rightPaneWidth: width })
      this.changeWidthEventListners.forEach(listener => {
        listener(width)
      })
    }

    filter (keyword) {
      if (typeof keyword !== 'string') {
        keyword = ''
      }
      this.filterdKeyword = keyword
      this.threadList.forEach(thread => {
        const item = thread.item
        const link = thread.link
        if (thread.title.includes(keyword)) {
          item.style.display = null
          link.innerHTML = thread.title.replace(keyword, `<mark>${keyword}</mark>`)
        } else {
          item.style.display = 'none'
          link.innerHTML = thread.title
        }
      })
      this.clickReadMoreIfDisplayed()
    }

    addChangeWidthEventListener (listner) {
      this.changeWidthEventListners.push(listner)
    }
  }

  class LeftDraggableBar {
    constructor (threadListAndBody) {
      this.setup(threadListAndBody)
    }

    setup (threadListAndBody) {
      this.draggableBar = document.querySelector('#kinspax-draggable-bar-left')
      if (this.draggableBar === null) {
        this.threadListAndBody = threadListAndBody
        this.setupThreadlist()
        this.threadListAndBody.addChangeWidthEventListener(() => {
          this.layout()
        })
        this.draggableBar = document.createElement('div')
        this.draggableBar.id = 'kinspax-draggable-bar-left'
        this.layout()
        this.setupMouseEvent()
        this.insertBar()
      } else {
        this.layout()
        this.setupMouseEvent()
      }
    }

    setupThreadlist () {
      this.threadListAndBody.contentRightPane.ondragstart = () => {
        return false
      }
      this.threadListAndBody.contentBody.ondragstart = () => {
        return false
      }
    }

    setupMouseEvent () {
      const that = this
      const onMouseMove = (event) => {
        if (event.pageX > 0) {
          that.draggableBar.style.left = event.pageX + 'px'
        }
      }
      const onMouseUp = (event) => {
        if (event.pageX > 0) {
          that.threadListAndBody.changeLeftPaneWidth(event.pageX)
          that.draggableBar.style.left = event.pageX + 'px'
        }
      }
      that.draggableBar.ondragstart = () => {
        return false
      }

      that.draggableBar.onmousedown = () => {
        document.addEventListener('mousemove', onMouseMove)
        that.draggableBar.onmouseup = (event) => {
          onMouseUp(event)
          document.removeEventListener('mousemove', onMouseMove)
          that.draggableBar.onmouseup = null
        }
      }

      this.draggableBar.addEventListener('dblclick', () => {
        that.threadListAndBody.changeLeftPaneWidth(null)
      })
    }

    layout () {
      this.syncHeight()
      this.syncXPosition()
    }

    syncHeight () {
      const intervalId = setInterval(() => {
        const spacebody = document.querySelector('.gaia-argoui-space-spacelayout-body')
        const computedStyleHeight = parseInt(window.getComputedStyle(spacebody).getPropertyValue('height'), 10)
        if (computedStyleHeight > 0) {
          this.draggableBar.style.height = computedStyleHeight + 'px'
          clearInterval(intervalId)
        }
      }, 600)
    }

    syncXPosition () {
      this.draggableBar.style.left = this.threadListAndBody.contentBody.offsetLeft + 'px'
    }

    insertBar () {
      this.threadListAndBody.contentLeftPane.insertAdjacentElement('afterend', this.draggableBar)
    }
  }

  class RightDraggableBar {
    constructor (threadListAndBody) {
      this.setup(threadListAndBody)
    }

    setup (threadListAndBody) {
      this.draggableBar = document.querySelector('#kinspax-draggable-bar-right')
      if (this.draggableBar === null) {
        this.threadListAndBody = threadListAndBody
        this.setupThreadlist()
        this.threadListAndBody.addChangeWidthEventListener(() => {
          this.layout()
        })
        this.draggableBar = document.createElement('div')
        this.draggableBar.id = 'kinspax-draggable-bar-right'
        this.layout()
        this.setupMouseEvent()
        this.insertBar()
      } else {
        this.layout()
        this.setupMouseEvent()
      }
    }

    setupThreadlist () {
      this.threadListAndBody.contentLeftPane.ondragstart = () => {
        return false
      }
      this.threadListAndBody.contentBody.ondragstart = () => {
        return false
      }
    }

    setupMouseEvent () {
      const that = this
      const onMouseMove = (event) => {
        if (event.pageX > 0) {
          that.draggableBar.style.left = event.pageX + 'px'
        }
      }
      const onMouseUp = (event) => {
        if (event.pageX > 0) {
          that.threadListAndBody.changeRightPaneWidth(document.body.scrollWidth - event.pageX)
          that.draggableBar.style.left = event.pageX + 'px'
        }
      }
      that.draggableBar.ondragstart = () => {
        return false
      }

      that.draggableBar.onmousedown = () => {
        document.addEventListener('mousemove', onMouseMove)
        that.draggableBar.onmouseup = (event) => {
          onMouseUp(event)
          document.removeEventListener('mousemove', onMouseMove)
          that.draggableBar.onmouseup = null
        }
      }

      this.draggableBar.addEventListener('dblclick', () => {
        that.threadListAndBody.changeRightPaneWidth(null)
      })
    }

    layout () {
      this.syncHeight()
      this.syncXPosition()
    }

    syncHeight () {
      const intervalId = setInterval(() => {
        const spacebody = document.querySelector('.gaia-argoui-space-spacelayout-body')
        const computedStyleHeight = parseInt(window.getComputedStyle(spacebody).getPropertyValue('height'), 10)
        if (computedStyleHeight > 0) {
          this.draggableBar.style.height = computedStyleHeight + 'px'
          clearInterval(intervalId)
        }
      }, 600)
    }

    syncXPosition () {
      this.draggableBar.style.left = this.threadListAndBody.contentBody.offsetLeft +
        this.threadListAndBody.contentBody.offsetWidth +
        'px'
    }

    insertBar () {
      this.threadListAndBody.contentRightPane.insertAdjacentElement('afterend', this.draggableBar)
    }
  }

  class ContentRight {
    constructor () {
      this.setup()
    }

    setup () {
      this.twopaneButton = document.querySelector('#kinspax-twopane-button')
      if (this.twopaneButton === null) {
        this.getElements()
        this.twopaneButton = document.createElement('a')
        this.twopaneButton.id = 'kinspax-twopane-button'
        this.collapseButton.insertAdjacentElement('beforebegin', this.twopaneButton)
        this.addButtonEventListener()
        chrome.storage.local.get([storageKeys.twopane], (result) => {
          if (result.twopane === true) {
            this.toggleTwopane(true)
          }
        })
      }
    }

    getElements () {
      this.collapseButton = document.querySelector('.gaia-argoui-space-toolbar-collapse')
      this.expandButton = document.querySelector('.gaia-argoui-space-toolbar-expand')
      this.contentBody = document.querySelector('.gaia-argoui-space-spacecontent.three-pane .gaia-argoui-space-spacecontent-body')
      this.contentRight = document.querySelector('.gaia-argoui-space-spacecontent.three-pane .gaia-argoui-space-spacecontent-right ')
    }

    addButtonEventListener () {
      this.twopaneButton.addEventListener('click', () => {
        this.toggleTwopane(true)
      })
      this.collapseButton.addEventListener('click', () => {
        this.toggleTwopane(false)
      })
      this.expandButton.addEventListener('click', () => {
        this.toggleTwopane(false)
      })
    }

    toggleTwopane (toCollapsed) {
      if (toCollapsed === true) {
        this.expandButton.click()
        this.expandButton.classList.remove('is-active')
        this.twopaneButton.classList.add('is-active')
        this.contentBody.style.marginRight = '0px'
        this.contentBody.style.borderRight = '0px'
        this.contentRight.style.display = 'none'
        chrome.storage.local.set({ twopane: true })
      } else {
        this.twopaneButton.classList.remove('is-active')
        this.contentBody.style.marginRight = null
        this.contentBody.style.borderRight = null
        this.contentRight.style.display = null
        chrome.storage.local.set({ twopane: false })
      }
    }
  }

  class FilterThread {
    constructor (threadListAndBody) {
      this.setup(threadListAndBody)
    }

    setup (threadListAndBody) {
      this.searchBox = document.querySelector('#kinspax-serchbox')
      if (this.searchBox === null) {
        this.threadListAndBody = threadListAndBody
        this.threadListAndBody.addChangeWidthEventListener((width) => {
          this.layout(width)
        })
        this.createSearchBox()
        this.addEventListener()
        this.insertSearchInput()
      }
    }

    createSearchBox () {
      this.searchBox = document.createElement('div')
      this.searchBox.id = 'kinspax-serchbox'
      this.serachInput = document.createElement('input')
      this.serachInput.id = 'kinspax-searchbox-input'
      this.serachInput.type = 'text'
      this.serachInput.placeholder = chrome.i18n.getMessage('serachInputPlaceholder')
      this.serachInput.autocomplete = 'off'
      this.searchBox.insertAdjacentElement('afterbegin', this.serachInput)
    }

    addEventListener () {
      this.serachInput.addEventListener('input', debounce((event) => {
        const keyword = event.srcElement.value
        this.threadListAndBody.filter(keyword)
      }, 200))

      this.serachInput.addEventListener('keydown', throttle((event) => {
        if (event.isComposing) {
          return
        }
        const keyword = event.srcElement.value
        if (keyword.length === 0) {
          return
        }
        const keyName = event.key
        if (keyName === 'ArrowDown') {
          event.preventDefault()
          this.selectNext()
        } else if (keyName === 'ArrowUp') {
          event.preventDefault()
          this.selectPrev()
        }
      }, 100))
    }

    selectNext () {
      let selectedIndex = -1
      let firstDisplayedLink = null
      const nextThread = this.threadListAndBody.threadList.filter((thread) => {
        return thread.item.style.display !== 'none'
      }).find((thread, index) => {
        if (firstDisplayedLink === null) {
          firstDisplayedLink = thread.link
        }
        if (thread.link.classList.contains('selected')) {
          selectedIndex = index
        } else if (selectedIndex >= 0) {
          return true
        }
        return false
      })
      if (nextThread !== undefined) {
        nextThread.link.click()
      } else if (selectedIndex === -1 && firstDisplayedLink != null) {
        firstDisplayedLink.click()
      }
    }

    selectPrev () {
      let selectedIndex = -1
      const prevThread = this.threadListAndBody.threadList.slice().reverse().filter((thread) => {
        return thread.item.style.display !== 'none'
      }).find((thread, index) => {
        if (thread.link.classList.contains('selected')) {
          selectedIndex = index
        } else if (selectedIndex >= 0) {
          return true
        }
        return false
      })
      if (prevThread !== undefined) {
        prevThread.link.click()
      }
    }

    insertSearchInput () {
      this.threadListAndBody.contentLeftPane.insertAdjacentElement('afterbegin', this.searchBox)
    }

    layout (width) {
      const paddingLeft = parseInt(window.getComputedStyle(this.serachInput).getPropertyValue('padding-left'), 10)
      const paddingRight = parseInt(window.getComputedStyle(this.serachInput).getPropertyValue('padding-right'), 10)
      if (width !== null) {
        let newWidth = width - paddingLeft - paddingRight
        newWidth = newWidth > 0 ? newWidth : 0
        this.serachInput.style.width = newWidth + 'px'
      } else {
        this.serachInput.style.width = null
      }
    }
  }

  let leftDraggable
  let rightDraggable
  let contentRight
  let filterThread
  const setup = () => {
    const intervalId = setInterval(() => {
      if (chrome.storage === undefined) {
        console.log('chrome.storage is undefined')
        return
      }
      const threadListAndBody = new ThredListAndBody()
      if (threadListAndBody.ready === true) {
        if (leftDraggable !== undefined) {
          leftDraggable.setup(threadListAndBody)
        } else {
          leftDraggable = new LeftDraggableBar(threadListAndBody)
        }
        if (rightDraggable !== undefined) {
          rightDraggable.setup(threadListAndBody)
        } else {
          rightDraggable = new RightDraggableBar(threadListAndBody)
        }
        if (contentRight !== undefined) {
          contentRight.setup()
        } else {
          contentRight = new ContentRight()
        }
        if (filterThread !== undefined) {
          filterThread.setup(threadListAndBody)
        } else {
          filterThread = new FilterThread(threadListAndBody)
        }
        clearInterval(intervalId)
      }
    }, 1000)
  }
  setup()
  window.onhashchange = () => {
    setup()
  }
})()

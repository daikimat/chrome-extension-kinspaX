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

  // TODO Separate classes into DomHolder and PanewidthChanger
  class ThredListAndBody {
    constructor () {
      this.changeWidthEventListners = []
      this.getElements()
      if (this.contentLeftPane !== null && this.contentRightPane !== null && this.contentBody !== null) {
        this.ready = true
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

    getElements () {
      this.content = document.querySelector('.gaia-argoui-space-spacecontent.three-pane')
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
      chrome.storage.local.set({ thredListWidth: width })
      this.changeWidthEventListners.forEach(listener => {
        listener()
      })
    }

    changeRightPaneWidth (width) {
      // super heavy
      if (this.ready === false) {
        return
      }
      let widthWithPx = null
      let rightPaneWidthWithPx = null
      if (width !== null) {
        widthWithPx = width + 'px'
        rightPaneWidthWithPx = (width - 1) + 'px'
      }
      this.contentRightPane.style.width = rightPaneWidthWithPx
      this.contentBody.style.borderRight = widthWithPx
      chrome.storage.local.set({ rightPaneWidth: width })
      this.changeWidthEventListners.forEach(listener => {
        listener()
      })
    }

    addChangeWidthEventListener (listner) {
      this.changeWidthEventListners.push(listner)
    }
  }

  class AutoClickReadmore {
    constructor (thredListAndBody) {
      this.setup(thredListAndBody)
    }

    setup (thredListAndBody) {
      this.afterClickReadMoreEventListeners = []
      this.threadListAndBody = thredListAndBody
      this.getElements()
      this.addEventListener()
      this.windowScrollEvent = throttle(() => {
        (async () => {
          await timer(50)
          this.clickReadMoreIfDisplayed()
        })()
      }, 50)
      window.addEventListener('scroll', this.windowScrollEvent)
    }

    getElements () {
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
          this.threadListAndBody.getElements()
          this.threadListAndBody.changeLeftPaneWidth(this.threadListAndBody.contentBody.offsetLeft)
          this.readMoreLoading = false
          this.afterClickReadMoreEventListeners.forEach(listener => {
            listener()
          })
        })()
      })
    }

    clickReadMoreIfDisplayed () {
      const isDisplayReadMore = (this.readMore.offsetParent !== null && this.readMore.style.display !== 'none')
      const isDisplayScrollPosition = (this.readMore.getBoundingClientRect().top - window.innerHeight) < 0
      if (isDisplayReadMore && isDisplayScrollPosition && this.readMoreLoading !== true) {
        this.readMore.click()
      }
    }

    addAfterClickReadMoreEventListener (listner) {
      this.afterClickReadMoreEventListeners.push(listner)
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
      this.barWidth = 8
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
          const rightWidth = document.body.scrollWidth - event.pageX
          that.draggableBar.style.right = rightWidth - (that.barWidth / 2) + 'px'
        }
      }
      const onMouseUp = (event) => {
        if (event.pageX > 0) {
          const rightWidth = document.body.scrollWidth - event.pageX
          that.threadListAndBody.changeRightPaneWidth(rightWidth)
          that.draggableBar.style.right = rightWidth - (that.barWidth / 2) + 'px'
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
      this.draggableBar.style.right = this.threadListAndBody.contentRightPane.offsetWidth - (this.barWidth / 2) + 'px'
    }

    insertBar () {
      this.threadListAndBody.contentRightPane.insertAdjacentElement('afterend', this.draggableBar)
    }
  }

  class PaneModeController {
    constructor (threadListAndBody, leftDraggableBar, rightDraggableBar) {
      this.setup(threadListAndBody, leftDraggableBar, rightDraggableBar)
    }

    setup (threadListAndBody, leftDraggableBar, rightDraggableBar) {
      this.threadListAndBody = threadListAndBody
      this.leftDraggableBar = leftDraggableBar
      this.rightDraggableBar = rightDraggableBar
      this.debounceReLayoutDraggableBar = debounce(() => {
        this.leftDraggableBar.layout()
        this.rightDraggableBar.layout()
      }, 100)
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
        this.threadListAndBody.content.classList.add('kinspax-two-pane')
        this.contentRight.style.display = 'none'
        chrome.storage.local.set({ twopane: true })
      } else {
        this.twopaneButton.classList.remove('is-active')
        this.threadListAndBody.content.classList.remove('kinspax-two-pane')
        this.contentRight.style.display = null
        chrome.storage.local.set({ twopane: false })
      }
      this.debounceReLayoutDraggableBar()
    }
  }

  class FilterThread {
    constructor (threadListAndBody, autoClickReadmore) {
      this.setup(threadListAndBody, autoClickReadmore)
    }

    setup (threadListAndBody, autoClickReadmore) {
      this.searchBox = document.querySelector('#kinspax-serchbox')
      if (this.searchBox === null) {
        this.threadListAndBody = threadListAndBody
        this.threadListAndBody.addChangeWidthEventListener(() => {
          if (this.threadListAndBody.ready === true) {
            this.layout(this.threadListAndBody.contentLeftPane.style.width.replace('px', ''))
          }
        })
        this.autoClickReadmore = autoClickReadmore
        this.autoClickReadmore.addAfterClickReadMoreEventListener(() => {
          this.filter(this.filterdKeyword)
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
        this.filter(keyword)
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
      if (width !== null && width > 0) {
        let newWidth = width - paddingLeft - paddingRight
        newWidth = newWidth > 0 ? newWidth : 0
        this.serachInput.style.width = newWidth + 'px'
      } else {
        this.serachInput.style.width = null
      }
    }

    filter (keyword) {
      if (typeof keyword !== 'string') {
        keyword = ''
      }
      this.filterdKeyword = keyword
      this.threadListAndBody.threadList.forEach(thread => {
        const item = thread.item
        const link = thread.link
        const matchIndex = thread.title.toLowerCase().indexOf(keyword.toLowerCase())
        if (matchIndex >= 0 || keyword === '') {
          item.style.display = null
          const beforeMatch = thread.title.slice(0, matchIndex)
          const match = thread.title.slice(matchIndex, matchIndex + keyword.length)
          const afterMatch = thread.title.slice(matchIndex + keyword.length, matchIndex + keyword.length + thread.title.length)
          link.innerHTML = beforeMatch + `<mark>${match}</mark>` + afterMatch
        } else {
          item.style.display = 'none'
          link.innerHTML = thread.title
        }
      })
      this.autoClickReadmore.clickReadMoreIfDisplayed()
    }
  }

  let autoClickReadmore
  let leftDraggable
  let rightDraggable
  let paneModeController
  let filterThread
  const setup = () => {
    const intervalId = setInterval(() => {
      if (chrome.storage === undefined) {
        console.log('chrome.storage is undefined')
        return
      }
      const threadListAndBody = new ThredListAndBody()
      if (threadListAndBody.ready === true) {
        if (autoClickReadmore !== undefined) {
          autoClickReadmore.setup(threadListAndBody)
        } else {
          autoClickReadmore = new AutoClickReadmore(threadListAndBody)
        }
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
        if (paneModeController !== undefined) {
          paneModeController.setup(threadListAndBody, leftDraggable, rightDraggable)
        } else {
          paneModeController = new PaneModeController(threadListAndBody, leftDraggable, rightDraggable)
        }
        if (filterThread !== undefined) {
          filterThread.setup(threadListAndBody, autoClickReadmore)
        } else {
          filterThread = new FilterThread(threadListAndBody, autoClickReadmore)
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

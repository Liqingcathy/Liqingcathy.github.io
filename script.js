window.onload = () => {
  const defaultButton = document.querySelector(".filterbtn.active");
  if (defaultButton) {
    defaultButton.click();
  }
}

const filterBySkills = (option) => {
  let filteredSkillList;
  filteredSkillList = Array.from(document.getElementsByClassName('filterby'));
  console.log('filteredSkillList', filteredSkillList);
  if (option == 'all') option = '';
  for (let i = 0; i < filteredSkillList.length; i++){
    removeClass(filteredSkillList[i], 'show');
    if (filteredSkillList[i].className.indexOf(option) > -1) {
      addClass(filteredSkillList[i], 'show');
    }
  }
}

const addClass = (domElement, elementClass) => {
  let elementClassName1, elementClassName2;
  elementClassName1 = domElement.className.split(' ');
  elementClassName2 = elementClass.split(' ');
  for(let i =0; i < elementClassName2.length; i++){
    if (elementClassName1.indexOf(elementClassName2[i]) == -1) {
      domElement.className += ' ' + elementClassName2[i];
      console.log(domElement.className);
    }
  }
}

const removeClass = (domElement, elementClass) => {
  let elementClassName1, elementClassName2;
  elementClassName1 = domElement.className.split(' ');
  elementClassName2 = elementClass.split(' ');
  for(let i =0; i < elementClassName2.length; i++){
    while (elementClassName1.indexOf(elementClassName2[i]) > -1) {
      elementClassName1.splice(elementClassName1.indexOf(elementClassName2[i], 1));
    }
  }
  domElement.className = elementClassName1.join(' ');
}
# A simple Ruby class demonstrating OOP features
class Animal
  def initialize(name)
    @name = name
  end

  def speak
    puts "#{@name} says: #{sound}"
  end
end

class Dog < Animal
  def sound
    "Woof!"
  end
end

class Cat < Animal
  def sound
    "Meow!"
  end
end

# Create and use some animals
[Dog.new("Rover"), Cat.new("Whiskers")].each(&:speak)
